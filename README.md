# Vultr Marketplace Action

GitHub Action for calling the Vultr Marketplace API from workflows.

This is a JavaScript action, not a workflow template. It runs on `node24` and has no npm dependencies or build step.

## Usage

```yaml
name: Vultr Marketplace

on:
  workflow_dispatch:

jobs:
  marketplace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: categories
        uses: ./
        with:
          api-key: ${{ secrets.VULTR_API_KEY }}
          operation: list-categories
      - run: |
          printf '%s\n' '${{ steps.categories.outputs.response }}'
```

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `api-key` | yes | Vultr API key. Use `secrets.VULTR_API_KEY`. |
| `operation` | no | Named operation, such as `list-apps`, `create-build-image`, or `create-build-from-snapshot`. |
| `method` | no | HTTP method for raw requests or overriding named operations. |
| `path` | no | Raw API path relative to `api-base`. Use this for new or changed Vultr endpoints. |
| `api-base` | no | Defaults to `https://api.vultr.com/v2`. |
| `app-id` | no | Marketplace app ID. |
| `variable-id` | no | Marketplace app variable ID. |
| `gallery-image-id` | no | Marketplace gallery image ID. |
| `image-id` | no | Marketplace image ID. Alias for `gallery-image-id` and used by deprecated app variable listing. |
| `build-id` | no | Marketplace build ID. |
| `snapshot-id` | no | Snapshot ID used by `create-build-from-snapshot`. |
| `version` | no | Build version used by `create-build-from-snapshot`, `create-build-from-vendor-data`, and `set-build-version`. |
| `use-vendor-data` | no | Whether to create a build from vendor data. Defaults to `true` for `create-build-from-vendor-data`. |
| `installation-script` | no | Installation script used by `create-build-from-vendor-data`. |
| `os-id` | no | Operating system ID used by `create-build-from-vendor-data`. |
| `vendor-user-id` | no | Marketplace vendor user ID. |
| `query` | no | JSON object converted to query string parameters. |
| `body` | no | JSON body by default. For uploads, this can include additional JSON fields. |
| `body-file` | no | File path to read as the request body. |
| `file` | no | File path to upload. Image operations convert this to Vultr's required base64 JSON field. |
| `base64-field` | no | JSON field name to use when encoding `file` as base64. Auto-detected for image operations. |
| `file-field` | no | Multipart file field name. Defaults to `file`. |
| `file-name` | no | Multipart upload file name. Defaults to the file basename. |
| `content-type` | no | `auto`, `json`, `base64-json`, `multipart`, `binary`, or `text`. Defaults to `auto`. |
| `fail-on-error` | no | Fail on non-2xx responses. Defaults to `true`. |

Provide either `operation` or `path`.

## Outputs

| Output | Description |
| --- | --- |
| `status` | HTTP response status code. |
| `response` | Response body. JSON responses are compact JSON text. |
| `headers` | Response headers as JSON text. |
| `build-id` | Marketplace build image ID for build operations. |

## Operations

### Convenience Operations

| Operation | Description |
| --- | --- |
| `create-build-from-snapshot` | Creates a build from `snapshot-id`; if `version` is supplied, updates the new build with that version. |
| `create-build-from-vendor-data` | Creates a build from `installation-script` and `os-id`; if `version` is supplied, updates the new build with that version. |
| `set-build-version` | Updates an existing `build-id` with `version`. |

### API Operations

| Operation | Method | Path |
| --- | --- | --- |
| `list-apps` | `GET` | `/marketplace/apps` |
| `create-app` | `POST` | `/marketplace/apps` |
| `get-app` | `GET` | `/marketplace/apps/{appId}` |
| `update-app` | `PATCH` | `/marketplace/apps/{appId}` |
| `delete-app` | `DELETE` | `/marketplace/apps/{appId}` |
| `update-visibility` | `PATCH` | `/marketplace/apps/{appId}/visibility` |
| `create-icon` | `PUT` | `/marketplace/apps/{appId}/icons` |
| `create-readme-image` | `POST` | `/marketplace/apps/readme/images` |
| `list-variables` | `GET` | `/marketplace/apps/{appId}/manage-variables` |
| `create-variable` | `POST` | `/marketplace/apps/{appId}/manage-variables` |
| `update-variable` | `PATCH` | `/marketplace/apps/{appId}/manage-variables/{variableId}` |
| `delete-variable` | `DELETE` | `/marketplace/apps/{appId}/manage-variables/{variableId}` |
| `list-app-input-variables` | `GET` | `/marketplace/apps/{imageId}/variables` |
| `list-gallery-images` | `GET` | `/marketplace/apps/{appId}/images` |
| `add-gallery-image` | `POST` | `/marketplace/apps/{appId}/images` |
| `update-gallery-image` | `PATCH` | `/marketplace/apps/{appId}/images/{imageId}` |
| `delete-gallery-image` | `DELETE` | `/marketplace/apps/{appId}/images/{imageId}` |
| `list-builds` | `GET` | `/marketplace/apps/{appId}/builds` |
| `create-build-image` | `POST` | `/marketplace/apps/{appId}/builds` |
| `update-build-image` | `PATCH` | `/marketplace/apps/{appId}/builds/{buildId}` |
| `delete-build-image` | `DELETE` | `/marketplace/apps/{appId}/builds/{buildId}` |
| `publish-build-image` | `POST` | `/marketplace/apps/{appId}/builds/{buildId}/publish` |
| `unpublish-build-image` | `POST` | `/marketplace/apps/{appId}/builds/{buildId}/unpublish` |
| `list-categories` | `GET` | `/marketplace/apps/categories` |
| `list-operating-systems` | `GET` | `/marketplace/apps/os` |
| `get-vendor-settings` | `GET` | `/marketplace/vendor` |
| `create-vendor-user` | `POST` | `/marketplace/vendor` |
| `update-vendor-user` | `PATCH` | `/marketplace/vendor` |

The action also accepts the human-readable operation names from the Vultr docs, such as `List Marketplace Apps`.

## Examples

### List Apps

```yaml
- id: apps
  uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: list-apps
```

### Create App

```yaml
- id: create-app
  uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: create-app
    body: |
      {
        "name": "Example App",
        "name_id_format": "example-app",
        "description": "Example Marketplace application",
        "os": "Linux",
        "repo_url": "https://github.com/example/app",
        "support_email": "support@example.com",
        "public_url_slug": "example-app",
        "deployable_on_vps": true,
        "deployable_on_bm": false,
        "deployable_on_gpu_compute": false,
        "deployable_on_gpu_workstation": false,
        "min_cpu_core": 1,
        "min_mem_mb": 1024,
        "category_ids": [1],
        "readme": "# Example App"
      }
```

### Update Visibility

```yaml
- uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: update-visibility
    app-id: ${{ vars.VULTR_MARKETPLACE_APP_ID }}
    body: |
      {
        "public": false
      }
```

### Upload Icon

The Vultr API expects image uploads as base64 JSON fields. For image operations, `file` is converted automatically.

```yaml
- uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: create-icon
    app-id: ${{ vars.VULTR_MARKETPLACE_APP_ID }}
    file: ./assets/icon.png
    body: |
      {
        "theme": "light_mode"
      }
```

### Raw Endpoint

Use `path` when Vultr adds or changes an endpoint before this action has a named operation for it.

```yaml
- uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    method: GET
    path: /marketplace/apps
    query: |
      {
        "per_page": 100
      }
```

## Tutorial: Create a Build From a Snapshot

This example creates a Marketplace app build image from an existing snapshot and sets the version on the new build.

Use repository variables or workflow inputs for values that change between releases.

```yaml
name: Create Marketplace Build

on:
  workflow_dispatch:
    inputs:
      app_id:
        description: Marketplace app ID
        required: true
      snapshot_id:
        description: Snapshot ID to build from
        required: true
      version:
        description: Build version
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Create build from snapshot
        id: build
        uses: vultr/vultr-marketplace-action@v1
        with:
          api-key: ${{ secrets.VULTR_API_KEY }}
          operation: create-build-from-snapshot
          app-id: ${{ inputs.app_id }}
          snapshot-id: ${{ inputs.snapshot_id }}
          version: ${{ inputs.version }}

      - name: Print build ID
        run: printf 'build-id=%s\n' '${{ steps.build.outputs.build-id }}'
```

The action creates the build with `use_vendor_data: false`, reads the new build ID, updates the build version, and exposes the ID as `steps.build.outputs.build-id`.

## Tutorial: Create a Build From Vendor Data

This example creates a Marketplace app build image from an installation script and operating system ID.

```yaml
- name: Create build from vendor data
  id: build
  uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: create-build-from-vendor-data
    app-id: ${{ inputs.app_id }}
    os-id: ${{ inputs.os_id }}
    version: ${{ inputs.version }}
    installation-script: |
      #!/bin/sh
      set -eu
      # Install and configure your application here.
```

## Tutorial: Update an Existing Build Version

```yaml
- name: Set build version
  uses: vultr/vultr-marketplace-action@v1
  with:
    api-key: ${{ secrets.VULTR_API_KEY }}
    operation: set-build-version
    app-id: ${{ inputs.app_id }}
    build-id: ${{ inputs.build_id }}
    version: ${{ inputs.version }}
```

## Notes

Vultr Marketplace endpoints require access to the Marketplace vendor API. If the API returns `401`, `403`, or `404`, verify the token permissions, vendor account status, and the exact endpoint path in the current Vultr API docs.
