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
        safe-chain-version = "1.5.13";

        safe-chain-platformMap = {
          "x86_64-linux" = "linuxstatic-x64";
          "aarch64-linux" = "linuxstatic-arm64";
          "x86_64-darwin" = "macos-x64";
          "aarch64-darwin" = "macos-arm64";
        };

        safe-chain-platform = safe-chain-platformMap.${system};

        safe-chain-hashes = {
          "x86_64-linux" = "sha256-4bvstimrPP7hK0HJ+xVm/n4+6qnY1B4rQHB7Y7Qr5Yc=";
          "aarch64-linux" = "sha256-BPmSzEwdCwY9DFfxj6IRGQ3KtBmGP4hfxwsXtSoIrog=";
          "x86_64-darwin" = "sha256-ucQBMSLRnBDfIUPUkeXvEm7aPZM8wcGMnue9LR21GYs=";
          "aarch64-darwin" = "sha256-JsI+OmqLc6WyUeGXA7IOBkol3ECXST781IbKeZ3hqCA=";
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

        # Safe-chain wrapped pnpm with dlx blocked. Lifecycle-only commands run
        # directly so their children do not inherit safe-chain's registry proxy.
        pnpm-safe = pkgs.writeShellScriptBin "pnpm" ''
          case "$1" in
            dlx)
              echo "pnpm dlx: blocked by safe-chain policy. Install as a devDependency instead." >&2
              exit 1
              ;;
            run|exec|node|test|start|stop|restart)
              exec ${pkgs.pnpm}/bin/pnpm "$@"
              ;;
          esac
          unset PKG_EXECPATH
          PATH="${pkgs.pnpm}/bin:${pkgs.nodejs_22}/bin:$PATH" exec ${safe-chain}/libexec/safe-chain-bin pnpm "$@"
        '';

        # Block pnpx (alias for pnpm dlx)
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
          (mkBlocker "npm" "pnpm")
          (mkBlocker "yarn" "pnpm")
          (mkBlocker "bun" "pnpm")
          (mkBlocker "deno" "pnpm")
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
              pnpm-safe
              pkgs.nodejs_22
              pkgs.git
              pkgs.ripgrep

              # Python for spec-kit
              pkgs.python312
              pkgs.uv
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.glibcLocales
            ];

          shellHook = ''
            uv sync --quiet
            export PATH="$PWD/.venv/bin:$PATH"
            ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
              # Playwright 1.59 predates Ubuntu 26.04 detection. Its Ubuntu 24.04
              # browser build is compatible and avoids requiring a system Chrome.
              export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu24.04-${
                if pkgs.stdenv.hostPlatform.isAarch64 then "arm64" else "x64"
              }"
            ''}

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
