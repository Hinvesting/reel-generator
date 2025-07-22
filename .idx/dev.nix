# To learn more about this file, see https://developer.idx.xyz/docs/configuration/
{ pkgs, ... }: {
  # Which nix channel to use.
  channel = "stable-23.11"; # Or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20 # Pinned to the latest Node.js 20 version
  ];
  # Sets environment variables in the workspace
  env = {};
  # Fast-starts services on port openings
  services.ports = [];
  # Manages VNC-based previews (like Android Emulators)
  services.vnc = {};

  # Defines scripts to be run on workspace startup
  idx.previews = {
    previews = [{
      command = [ "npm" "run" "dev" "--" "--host" "0.0.0.0" ];
      id = "web";
      manager = "web";
    }];
  };
}