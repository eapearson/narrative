# Running Narrative in local Docker

It is useful to run the Narrative within a local docker container. E.g. this makes it easy to work on Narrative ui locally integrated with a local instance of kbase-ui.

## Narrative

The following changes are required:

- Build the docker image using the make target "dev_image", this builds the docker image without the "grunt minify" step.
  The image will be tagged kbase/narrative:dev instead of the current git branch

  ```bash
  make dev-image
  ```

- start the container:

    ```bash
    ENV={ci/next/prod} [PORT=<some port number>] make run-dev-image
    ```

    where
    - `ENV` sets the `CONFIG_ENV` environment variable for the Docker container; ci is the environment in which you are working (needs to be same as the ui is running on.)
    - `PORT` sets the host port that can be used. E.g. if you use `PORT=12345`, then `http://localhost:12345` will start the Narrative. Default is `8888`. Note that the logging on the console will always show 8888 since that will be used internally within the container.

    Also note:
    - uses the config set $env; makes it easy to test different environments alongside ui
    - uses `kbase-dev` network; allows interoperation with the kbase-ui proxy.
    - uses name "narrative" within the kbase-dev network; which is expected by the kbase-ui proxy tools
    - mounts the kbase static directory inside the container; allows editing files on host and having changes reflected with a Narrative reload
    - removes container when done; easy cleanup
    - uses "dev" tagged container; matches the docker build task above

## Notes

The container can't be killed with Ctrl-C; you'll need to stop it using Docker or another tool like Kitematic.

If you need to update or change dependencies (bower.json), you'll need to rebuild the image.

### config.json changes

The Dockerfile runs 'src/scripts/kb-update-config' to generate '/kb/deployment/ui-common/narrative_version'. This script has the unfortunate side effect of overwriting the config file source in /src/config.json.
This is a little frustrating because it means that a committer has to be very careful to omit this file when building the image for development or testing.

## kbase-ui

The kbase-ui proxier knows how to route to a local narrative container. To invoke this behavior add `local-narrative=t` to the start line as run from the kbase-ui repo:

```
make dev-start env=ci build=dev build-image=f local-narrative=t
```

> Use `build-image=t` if you haven't built the kbase-ui image yet.

## Done?

You should now be able to navigate to https://ci.kbase.us, log in, and pull a Narrative from the Dashboard.
