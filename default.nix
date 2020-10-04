{ pkgs ? import <nixpkgs> {} }:

with pkgs.stdenv;

mkDerivation rec {
  pname = "game";
  version = "0.1";

  buildInputs = (with pkgs; [
    nodejs-13_x
    tiled
  ]);

  LD_LIBRARY_PATH = "${pkgs.libuuid.out}/lib";
}
