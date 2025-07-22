{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.nodejs_20
  ];
  idx.previews = {
    previews = [{
      command = [ "npm" "run" "dev" "--" "--host" "5.1.7.3" ];
      id = "web";
      manager = "web";
    }];
  };
}