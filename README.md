# dirt-cheap-rocket
dirt-cheap-rocket is a fast local static site hosting and reverse proxy for testing purposes. It is optimised for Coursemology builds, but can be forked and customised for other app's builds.

## Usage
dirt-cheap-rocket exposes 4 required parameters as environment variables.
>[!WARNING]
>There are no default values for these parameters. If any one is unset, dirt-cheap-rocket will refuse to run.

| Variable | Example | Details |
| - | - | - |
| `DCR_CLIENT_PORT` | `8080` | The port of the static site. |
| `DCR_SERVER_PORT` | `5000` | The port of the server app. All API requests will be rewritten to this port. |
| `DCR_ASSETS_DIR` | `/somewhere/build` | The path where static files are stored on the file system. This can be relative to dirt-cheap-rocket's executable, or absolute from the root file system. |
| `DCR_PUBLIC_PATH` | `/static` | The path where static files will be hosted. If you set this to `/static` and `DCR_CLIENT_PORT` to `8080`, then all the files in `DCR_ASSETS_DIR` will be hosted at `http://localhost:8080/static`. If you're using [webpack](https://webpack.js.org/), set this to the [`output.publicPath`](https://webpack.js.org/guides/public-path/) of your configuration. |

To start serving static files, run dirt-cheap-rocket like so.
```sh
DCR_CLIENT_PORT=4200 DCR_SERVER_PORT=6969 DCR_PUBLIC_PATH='/static' DCR_ASSETS_DIR='/some/folder/somewhere/client/build' yarn serve
```

## Proxying rules
>[!NOTE]
>The code for dirt-cheap-rocket is extremely short, so if you may prefer to just read the code instead of reading this section.

dirt-cheap-rocket is a server that runs on `http://localhost:${DCR_CLIENT_PORT}`.

By default, dirt-cheap-rocket proxies requests by these rules, in this order.
1. Requests with `?format=json` query will be proxied to `http://localhost:${DCR_SERVER_PORT}`.  
This rewrite will also replace the `Origin` header to `http://localhost:${DCR_SERVER_PORT}` to satisfy CORS. From the server app's POV, the request will look like it's from itself.

2. Requests to `/${DCR_PUBLIC_PATH}/*` will be served the static files in the `DCR_ASSETS_DIR` directory.  
Responses will have all the correct headers. Thank express for this.

3. Anything else will be served `/index.html`.  
This allows for React Router or similar client-side routing logic to work.

These rules are used in Coursemology builds.

## Ready-to-use released builds
The easiest way to use dirt-cheap-rocket is with the built binaries. There are 3 flavours:
| Flavour | File name | File size | Use |
| - | - | - | - |
| Standalone (Linux, x64) | `dirt-cheap-rocket-linux-x64` | 43.4 MB | Doesn't need Node installed. Suitable for CIs, since most are running x64 instances. |
| Standalone (macOS, Apple Silicon) | `dirt-cheap-rocket-macos-arm64` | 43.6 MB | Doesn't need Node installed. Suitable for local testing on Apple Silicon Macs. |
| Node script (JavaScript) | `dirt-cheap-rocket.cjs` | 841 KB | Needs Node installed, tested on Node 18.1.2. Suitable for CIs with Node available, since its file size is extremely small. |

>[!NOTE]
>It is highly recommended to use the Node script flavour for CIs because of its small size. Most CI instances have Node installed anyway.

## Usage in CircleCI (or other CI platforms)
You can download the latest binaries by prefixing the file names with `https://github.com/Coursemology/dirt-cheap-rocket/releases/latest/download/`. 

>[!NOTE]
>If you're using `curl`, remember to add `-L` because GitHub redirects this URL to another one before downloading the file.

Sample command configuration for CircleCI. You can adapt similarly for other CI platforms.

```yml
commands:
  serve_static_site:
    steps:
      - run:
          name: Download dirt-cheap-rocket
          command: curl https://github.com/Coursemology/dirt-cheap-rocket/releases/latest/download/dirt-cheap-rocket.cjs -o dirt-cheap-rocket.cjs -L
      - run:
          name: Serve static site
          command: node dirt-cheap-rocket.cjs
          background: true
          environment:
            DCR_CLIENT_PORT: 4200
            DCR_SERVER_PORT: 6969
            DCR_PUBLIC_PATH: /static
            DCR_ASSETS_DIR: client/build
```

### Never gonna give you up~
dirt-cheap-rocket starts the server **immediately**, so there's no need to wait for the server to start (for example, with a recursive `curl`). dirt-cheap-rocket also will never immediately terminate if any connections are refused. This is desireable in CI environments to allow further tests to run, before the job eventually terminates. Errors are printed to the standard output, complete with the timestamp and target path, so you can debug your failed tests individually.

### No need for caching
If your CI platform supports caching (like [CircleCI's dependency caches](https://circleci.com/docs/caching/)), there's no need to cache dirt-cheap-rocket, even if you're using the large standalone binary. This is because the time taken to restore the cache is comparable to the time it takes to download the binary.
