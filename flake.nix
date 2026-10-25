{
  description = "MoneyFlow development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Safe-chain binary (pre-built from Aikido releases)
        safe-chain-version = "1.5.25";

        safe-chain-platformMap = {
          "x86_64-linux" = "linuxstatic-x64";
          "aarch64-linux" = "linuxstatic-arm64";
          "x86_64-darwin" = "macos-x64";
          "aarch64-darwin" = "macos-arm64";
        };

        safe-chain-platform = safe-chain-platformMap.${system};

        safe-chain-hashes = {
          "x86_64-linux" = "sha256-NGKoOV+CKzkrfAgIxwEW75DheloUeeYEz8QdV7+9gnw=";
          "aarch64-linux" = "sha256-wYDyYvk18hZ6Y3mKsZVwny+S8cWBj9EZLAfCLBFp2d8=";
          "x86_64-darwin" = "sha256-nsCvBva7vg1BbdjANyeTDtq+OXIDYc2hs5jDKtdpw3g=";
          "aarch64-darwin" = "sha256-W9SJaGjiFPa96qYA3I35chUBF2aGiIUT60bTrVHSLYY=";
        };

        safe-chain = pkgs.stdenv.mkDerivation {
          pname = "safe-chain";
          version = safe-chain-version;

          src = pkgs.fetchurl {
            url = "https://github.com/AikidoSec/safe-chain/releases/download/${safe-chain-version}/safe-chain-${safe-chain-platform}";
            sha256 = safe-chain-hashes.${system};
          };

          unpackPhase = ":";

          # SEA binaries have data appended that strip removes
          dontStrip = true;

          installPhase = ''
            # Keep the binary outside bin/ so safe-chain stores its generated
            # certificate under the writable user directory, not the Nix store.
            install -m755 -D $src $out/libexec/safe-chain-bin
          '';

          meta = with pkgs.lib; {
            homepage = "https://github.com/AikidoSec/safe-chain";
            license = licenses.agpl3Plus;
            description = "Block malicious npm/pip packages";
            platforms = builtins.attrNames safe-chain-hashes;
          };
        };

        # Bun, pinned from the @oven/bun-<platform> npm-registry tarball rather than nixpkgs so the
        # version moves only when this flake is edited, subject to the same minimum package age.
        bun-version = "1.4.3";

        bun-platformMap = {
          "x86_64-linux" = "linux-x64";
          "aarch64-linux" = "linux-aarch64";
          "x86_64-darwin" = "darwin-x64";
          "aarch64-darwin" = "darwin-aarch64";
        };

        bun-hashes = {
          "x86_64-linux" = "sha256-79Bp1HTmrdzu3g3JwJgbRCHPNc6zNI5Lg0YgU6F3KB8=";
          "aarch64-linux" = "sha256-VX6dVocbMWzMVoVplSg+eYg5svyyGt7vOdZBO3FWM+E=";
          "x86_64-darwin" = "sha256-bvx8xNmFqzGF+gK72OsgC2orfngD7nzIELGt8RdxERI=";
          "aarch64-darwin" = "sha256-76w0M7dcu+hHi9CjOfK/GW0swbyN00gRjGiTkbQSv3k=";
        };

        bun-raw = pkgs.stdenvNoCC.mkDerivation {
          pname = "bun-raw";
          version = bun-version;

          src = pkgs.fetchurl {
            url = "https://registry.npmjs.org/@oven/bun-${bun-platformMap.${system}}/-/bun-${bun-platformMap.${system}}-${bun-version}.tgz";
            sha256 = bun-hashes.${system};
          };

          dontConfigure = true;
          dontBuild = true;
          nativeBuildInputs = pkgs.lib.optionals pkgs.stdenvNoCC.hostPlatform.isLinux [
            pkgs.autoPatchelfHook
          ];
          # No glib/libsecret runtimeDependencies, which only Bun.secrets needs: on Bun 1.4.2 that
          # RPATH segfaults every launch.

          installPhase = ''
            runHook preInstall
            install -Dm755 bin/bun $out/bin/bun
            runHook postInstall
          '';
        };

        # safe-chain spawns `bun` from its own PATH, so the unwrapped binary lives in a directory only
        # that PATH sees. Putting it first stops safe-chain re-entering the wrapper below.
        bun-shadow = pkgs.runCommand "bun-shadow" { } ''
          mkdir -p $out/shadow
          ln -s ${bun-raw}/bin/bun $out/shadow/bun
        '';

        # Package-management subcommands run through safe-chain. Everything else runs bun directly so
        # `bun run` children do not inherit safe-chain's HTTPS_PROXY.
        bun-safe = pkgs.writeShellScriptBin "bun" ''
          case "$1" in
            x|create|upgrade|publish)
              echo "bun $1: blocked by safe-chain policy. Add a dependency to package.json instead." >&2
              exit 1
              ;;
            install|i|add|a|remove|rm|update|outdated|pm|audit|link|unlink|patch|why|info)
              unset PKG_EXECPATH
              PATH="${bun-shadow}/shadow:${pkgs.nodejs_22}/bin:$PATH" exec ${safe-chain}/libexec/safe-chain-bin bun "$@"
              ;;
          esac
          exec ${bun-raw}/bin/bun "$@"
        '';

        mkBlocker =
          name: alt:
          pkgs.writeShellScriptBin name ''
            echo "${name}: blocked by safe-chain policy. Use ${alt} instead." >&2
            exit 1
          '';

        mkExecutorBlocker =
          name:
          pkgs.writeShellScriptBin name ''
            echo "${name}: blocked by safe-chain policy. One-shot execution is disabled." >&2
            exit 1
          '';

        blockers = [
          (mkBlocker "npm" "bun")
          (mkBlocker "yarn" "bun")
          (mkBlocker "pnpm" "bun")
          (mkBlocker "deno" "bun")
          (mkExecutorBlocker "npx")
          (mkExecutorBlocker "pnpx")
          (mkExecutorBlocker "bunx")
        ];

        # Safe-chain with setup commands blocked (flake handles this)
        safe-chain-wrapped = pkgs.writeShellScriptBin "safe-chain" ''
          case "$1" in
            setup|teardown|setup-ci|help|"")
              echo "safe-chain $1: blocked. The flake handles safe-chain integration." >&2
              exit 1
              ;;
            --version|-v)
              unset PKG_EXECPATH
              exec ${safe-chain}/libexec/safe-chain-bin "$@"
              ;;
            *)
              echo "safe-chain $1: blocked. The flake handles safe-chain integration." >&2
              exit 1
              ;;
          esac
        '';

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs =
            # Blockers must precede nodejs_22 (which bundles npm/npx)
            blockers
            ++ [
              safe-chain-wrapped
              bun-safe
              pkgs.nodejs_22
              pkgs.git
              pkgs.ripgrep

              # Python for spec-kit
              pkgs.python312
              pkgs.uv

              # Infrastructure as code. The CLI is a Go binary that isn't published to npm, so it is
              # pinned here rather than through bun. The -bin build bundles the Node.js language host
              # that TypeScript programs need.
              pkgs.pulumi-bin
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
              pkgs.glibcLocales
            ];

          shellHook = ''
            REPO=$(git rev-parse --show-toplevel)
            export PATH="$REPO/cli/bin:$PATH"

            uv sync --quiet
            export PATH="$REPO/.venv/bin:$PATH"

            # Background check for safe-chain updates (minor/major only)
            (
              latest=$(${pkgs.curl}/bin/curl -sfL -o /dev/null -w '%{url_effective}' \
                "https://github.com/AikidoSec/safe-chain/releases/latest" \
                | grep -oE '[0-9]+\.[0-9]+\.[0-9]+$') || exit 0
              current="${safe-chain-version}"
              current_major=''${current%%.*}
              current_minor=''${current#*.}; current_minor=''${current_minor%%.*}
              latest_major=''${latest%%.*}
              latest_minor=''${latest#*.}; latest_minor=''${latest_minor%%.*}
              if [ "$current_major" != "$latest_major" ] || [ "$current_minor" != "$latest_minor" ]; then
                echo "[safe-chain] update available: $current -> $latest (update flake.nix)" >&2
              fi
            ) &
          '';
        };

        formatter = pkgs.nixfmt;
      }
    );
}
