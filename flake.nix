{
  description = "MoneyFlow development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js for Next.js development
            nodejs_22
            pnpm
            
            # Python for spec-kit
            python312
            uv
          ];

          shellHook = ''
              uv sync --quiet
              export PATH="$PWD/.venv/bin:$PATH"
          '';
        };
      }
    );
}
