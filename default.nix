{ pkgs ? import <nixpkgs> {} }:

with pkgs.stdenv;

mkDerivation rec {
  pname = "game";
  version = "0.1";

  buildInputs = with pkgs; [
    nodejs
    yarn
    nodePackages.typescript
    nodePackages.typescript-language-server
  ];
}
