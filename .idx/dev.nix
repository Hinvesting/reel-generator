{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.nodejs_20
  ];
  idx.previews = {
    previews = [{
      command = [ "npm" "run" "dev" "--" "--host" "0.0.0.0" ];
      id = "web";
      manager = "web";
    }];
  };
}