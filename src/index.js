const fs = require('fs');
const path = require('path');

const OPERATIONS = {
  'list-apps': { method: 'GET', path: '/marketplace/apps' },
  'create-app': { method: 'POST', path: '/marketplace/apps' },
  'get-app': { method: 'GET', path: '/marketplace/apps/{appId}' },
  'update-app': { method: 'PATCH', path: '/marketplace/apps/{appId}' },
  'delete-app': { method: 'DELETE', path: '/marketplace/apps/{appId}' },
  'update-visibility': { method: 'PATCH', path: '/marketplace/apps/{appId}/visibility' },
  'create-icon': { method: 'PUT', path: '/marketplace/apps/{appId}/icons', base64Field: 'b64_image' },
  'create-readme-image': { method: 'POST', path: '/marketplace/apps/readme/images', base64Field: 'image_b64' },
  'list-variables': { method: 'GET', path: '/marketplace/apps/{appId}/manage-variables' },
  'create-variable': { method: 'POST', path: '/marketplace/apps/{appId}/manage-variables' },
  'update-variable': { method: 'PATCH', path: '/marketplace/apps/{appId}/manage-variables/{variableId}' },
  'delete-variable': { method: 'DELETE', path: '/marketplace/apps/{appId}/manage-variables/{variableId}' },
  'list-app-input-variables': { method: 'GET', path: '/marketplace/apps/{imageId}/variables' },
  'list-gallery-images': { method: 'GET', path: '/marketplace/apps/{appId}/images' },
  'add-gallery-image': { method: 'POST', path: '/marketplace/apps/{appId}/images', base64Field: 'b64_image' },
  'update-gallery-image': { method: 'PATCH', path: '/marketplace/apps/{appId}/images/{imageId}' },
  'delete-gallery-image': { method: 'DELETE', path: '/marketplace/apps/{appId}/images/{imageId}' },
  'list-builds': { method: 'GET', path: '/marketplace/apps/{appId}/builds' },
  'create-build-image': { method: 'POST', path: '/marketplace/apps/{appId}/builds' },
  'update-build-image': { method: 'PATCH', path: '/marketplace/apps/{appId}/builds/{buildId}' },
  'delete-build-image': { method: 'DELETE', path: '/marketplace/apps/{appId}/builds/{buildId}' },
  'publish-build-image': { method: 'POST', path: '/marketplace/apps/{appId}/builds/{buildId}/publish' },
  'unpublish-build-image': { method: 'POST', path: '/marketplace/apps/{appId}/builds/{buildId}/unpublish' },
  'list-categories': { method: 'GET', path: '/marketplace/apps/categories' },
  'list-operating-systems': { method: 'GET', path: '/marketplace/apps/os' },
  'get-vendor-settings': { method: 'GET', path: '/marketplace/vendor' },
  'create-vendor-user': { method: 'POST', path: '/marketplace/vendor' },
  'update-vendor-user': { method: 'PATCH', path: '/marketplace/vendor' },
};

const OPERATION_ALIASES = {
  'list marketplace apps': 'list-apps',
  'create marketplace app': 'create-app',
  'get application': 'get-app',
  'update marketplace app': 'update-app',
  'delete marketplace app': 'delete-app',
  'update marketplace app visibility': 'update-visibility',
  'create marketplace app icon': 'create-icon',
  'create a marketplace app readme image': 'create-readme-image',
  'list marketplace app variables': 'list-variables',
  'create marketplace app variable': 'create-variable',
  'update marketplace app variable': 'update-variable',
  'delete marketplace app variable': 'delete-variable',
  'list marketplace app gallery images': 'list-gallery-images',
  'add image to marketplace app': 'add-gallery-image',
  'update marketplace app gallery image': 'update-gallery-image',
  'delete marketplace app gallery image': 'delete-gallery-image',
  'list marketplace app builds': 'list-builds',
  'create marketplace app build image': 'create-build-image',
  'update marketplace app build image': 'update-build-image',
  'delete marketplace app build image': 'delete-build-image',
  'publish marketplace app build image': 'publish-build-image',
  'unpublish marketplace app build image': 'unpublish-build-image',
  'list marketplace app categories': 'list-categories',
  'list marketplace operating systems': 'list-operating-systems',
  'get marketplace vendor settings': 'get-vendor-settings',
  'create marketplace vendor user': 'create-vendor-user',
  'update marketplace vendor user': 'update-vendor-user',
};

const HIGH_LEVEL_OPERATIONS = new Set([
  'create-build-from-snapshot',
  'create-build-from-vendor-data',
  'set-build-version',
]);

const MASKED_HEADER_NAMES = new Set([
  'x-user',
  'x-vid',
]);

function getInput(name, options = {}) {
  const keys = [
    `INPUT_${name.replace(/ /g, '_').toUpperCase()}`,
    `INPUT_${name.replace(/ /g, '_').replace(/-/g, '_').toUpperCase()}`,
  ];
  const value = keys.map((key) => process.env[key]).find((item) => item !== undefined) || '';
  const trimmed = options.trimWhitespace === false ? value : value.trim();

  if (options.required && !trimmed) {
    throw new Error(`Input required and not supplied: ${name}`);
  }

  return trimmed;
}

function setOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  const text = typeof value === 'string' ? value : JSON.stringify(value);

  if (!output) {
    console.log(`${name}=${text}`);
    return;
  }

  const delimiter = `ghadelimiter_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(output, `${name}<<${delimiter}\n${text}\n${delimiter}\n`, 'utf8');
}

function maskValue(value) {
  if (!value) {
    return;
  }

  console.log(`::add-mask::${value}`);
}

function maskHeaders(headers) {
  for (const [key, value] of Object.entries(headers)) {
    if (MASKED_HEADER_NAMES.has(key.toLowerCase())) {
      maskValue(value);
    }
  }
}

function parseJsonInput(name) {
  const value = getInput(name, { trimWhitespace: false });
  if (!value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Input ${name} must be valid JSON: ${error.message}`);
  }
}

function normalizeOperation(operation) {
  const normalized = operation
    .trim()
    .toLowerCase()
    .replace(/[._]+/g, '-')
    .replace(/\s+/g, ' ');

  if (OPERATION_ALIASES[normalized]) {
    return OPERATION_ALIASES[normalized];
  }

  return normalized.replace(/\s+/g, '-');
}

function resolveTemplate(template, values) {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (_match, key) => {
    const value = values[key];
    if (!value) {
      const inputName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      throw new Error(`Input ${inputName} is required for path ${template}`);
    }

    return encodeURIComponent(value);
  });
}

function buildUrl(apiBase, requestPath, query) {
  const base = apiBase.replace(/\/+$/, '');
  const relativePath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  const url = new URL(`${base}${relativePath}`);

  if (query) {
    if (typeof query !== 'object' || Array.isArray(query)) {
      throw new Error('Input query must be a JSON object');
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

function createJsonBody(payload) {
  return { body: JSON.stringify(payload), contentType: 'application/json' };
}

function inferContentMode(contentType, file, body, bodyFile, base64Field) {
  if (contentType && contentType !== 'auto') {
    return contentType;
  }

  if (file && base64Field) {
    return 'base64-json';
  }

  if (file) {
    return 'multipart';
  }

  if (body || bodyFile) {
    return 'json';
  }

  return 'none';
}

function createRequestBody(mode, bodyInput, bodyFile, filePath, base64Field) {
  if (mode === 'none') {
    return { body: undefined, contentType: undefined };
  }

  if (mode === 'binary') {
    if (!filePath && !bodyFile) {
      throw new Error('content-type binary requires file or body-file');
    }

    const source = filePath || bodyFile;
    return { body: fs.readFileSync(source), contentType: 'application/octet-stream' };
  }

  if (mode === 'multipart') {
    if (!filePath) {
      throw new Error('content-type multipart requires file');
    }

    const form = new FormData();
    const fileField = getInput('file-field') || 'file';
    const fileName = getInput('file-name') || path.basename(filePath);
    const fileBytes = fs.readFileSync(filePath);

    form.append(fileField, new Blob([fileBytes]), fileName);

    if (bodyInput.trim()) {
      const fields = JSON.parse(bodyInput);
      if (typeof fields !== 'object' || Array.isArray(fields) || fields === null) {
        throw new Error('Input body must be a JSON object when using multipart uploads');
      }

      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined) {
          continue;
        }
        form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }

    return { body: form, contentType: undefined };
  }

  if (mode === 'base64-json') {
    if (!filePath) {
      throw new Error('content-type base64-json requires file');
    }

    if (!base64Field) {
      throw new Error('content-type base64-json requires base64-field');
    }

    const payload = bodyInput.trim() ? JSON.parse(bodyInput) : {};
    if (typeof payload !== 'object' || Array.isArray(payload) || payload === null) {
      throw new Error('Input body must be a JSON object when using base64-json uploads');
    }

    payload[base64Field] = fs.readFileSync(filePath).toString('base64');
    return { body: JSON.stringify(payload), contentType: 'application/json' };
  }

  if (mode === 'text') {
    const text = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : bodyInput;
    return { body: text, contentType: 'text/plain' };
  }

  if (mode !== 'json') {
    throw new Error('content-type must be one of auto, json, base64-json, multipart, binary, or text');
  }

  const jsonText = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : bodyInput;
  if (!jsonText.trim()) {
    return { body: undefined, contentType: undefined };
  }

  JSON.parse(jsonText);
  return { body: jsonText, contentType: 'application/json' };
}

async function run() {
  const apiKey = getInput('api-key', { required: true });
  const apiBase = getInput('api-base') || 'https://api.vultr.com/v2';
  const operationInput = getInput('operation');
  const rawPath = getInput('path');
  const methodOverride = getInput('method');
  const query = parseJsonInput('query');
  const bodyInput = getInput('body', { trimWhitespace: false });
  const bodyFile = getInput('body-file');
  const filePath = getInput('file');
  const base64FieldInput = getInput('base64-field');
  const contentType = (getInput('content-type') || 'auto').toLowerCase();
  const failOnError = (getInput('fail-on-error') || 'true').toLowerCase() !== 'false';
  const snapshotId = getInput('snapshot-id');
  const version = getInput('version');
  const useVendorDataInput = getInput('use-vendor-data');
  const installationScript = getInput('installation-script', { trimWhitespace: false });
  const osId = getInput('os-id');

  let definition;
  let operation;
  if (operationInput) {
    operation = normalizeOperation(operationInput);
    definition = OPERATIONS[operation];
    if (!definition && !HIGH_LEVEL_OPERATIONS.has(operation)) {
      const names = [...Object.keys(OPERATIONS), ...HIGH_LEVEL_OPERATIONS].sort().join(', ');
      throw new Error(`Unknown operation ${operationInput}. Supported operations: ${names}`);
    }
  } else if (rawPath) {
    definition = { method: methodOverride || 'GET', path: rawPath };
  } else {
    throw new Error('Provide either operation or path');
  }

  const values = {
    appId: getInput('app-id'),
    variableId: getInput('variable-id'),
    imageId: getInput('image-id') || getInput('gallery-image-id'),
    buildId: getInput('build-id'),
    vendorUserId: getInput('vendor-user-id'),
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  const request = async ({ requestDefinition, requestBody, requestQuery = query }) => {
    const requestPath = resolveTemplate(requestDefinition.path, values);
    const method = (requestDefinition.method).toUpperCase();
    const url = buildUrl(apiBase, requestPath, requestQuery);
    const requestHeaders = { ...headers };

    if (requestBody.contentType) {
      requestHeaders['Content-Type'] = requestBody.contentType;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody.body,
    });
    const responseText = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    maskHeaders(responseHeaders);

    if (!response.ok && failOnError) {
      throw new Error(`Vultr API request failed with ${response.status}: ${responseText}`);
    }

    return { response, responseText, responseHeaders };
  };

  const outputResult = async (result, buildId) => {
    let outputResponse = result.responseText;

    try {
      outputResponse = JSON.stringify(JSON.parse(result.responseText));
    } catch (_error) {
      // Non-JSON responses are returned as-is.
    }

    setOutput('status', String(result.response.status));
    setOutput('headers', result.responseHeaders);
    setOutput('response', outputResponse);

    if (buildId) {
      setOutput('build-id', String(buildId));
    }
  };

  if (operation === 'create-build-from-snapshot') {
    if (!values.appId) {
      throw new Error('Input app-id is required for create-build-from-snapshot');
    }
    if (!snapshotId) {
      throw new Error('Input snapshot-id is required for create-build-from-snapshot');
    }

    const createResult = await request({
      requestDefinition: OPERATIONS['create-build-image'],
      requestBody: createJsonBody({ use_vendor_data: false, snapshot_id: snapshotId }),
      requestQuery: undefined,
    });
    const createResponse = JSON.parse(createResult.responseText || '{}');
    const buildId = createResponse.marketplace_image_id || createResponse.marketplace_app_build?.id || createResponse.id;

    if (!buildId) {
      throw new Error(`Unable to determine build ID from response: ${createResult.responseText}`);
    }

    if (!version) {
      await outputResult(createResult, buildId);
      return;
    }

    values.buildId = String(buildId);
    const updateResult = await request({
      requestDefinition: OPERATIONS['update-build-image'],
      requestBody: createJsonBody({ version }),
      requestQuery: undefined,
    });

    await outputResult(updateResult, buildId);
    return;
  }

  if (operation === 'create-build-from-vendor-data') {
    if (!values.appId) {
      throw new Error('Input app-id is required for create-build-from-vendor-data');
    }
    if (!installationScript) {
      throw new Error('Input installation-script is required for create-build-from-vendor-data');
    }
    if (!osId) {
      throw new Error('Input os-id is required for create-build-from-vendor-data');
    }

    const createResult = await request({
      requestDefinition: OPERATIONS['create-build-image'],
      requestBody: createJsonBody({
        use_vendor_data: useVendorDataInput ? useVendorDataInput.toLowerCase() !== 'false' : true,
        installation_script: installationScript,
        OSID: Number(osId),
      }),
      requestQuery: undefined,
    });
    const createResponse = JSON.parse(createResult.responseText || '{}');
    const buildId = createResponse.marketplace_image_id || createResponse.marketplace_app_build?.id || createResponse.id;

    if (!buildId) {
      throw new Error(`Unable to determine build ID from response: ${createResult.responseText}`);
    }

    if (!version) {
      await outputResult(createResult, buildId);
      return;
    }

    values.buildId = String(buildId);
    const updateResult = await request({
      requestDefinition: OPERATIONS['update-build-image'],
      requestBody: createJsonBody({ version }),
      requestQuery: undefined,
    });

    await outputResult(updateResult, buildId);
    return;
  }

  if (operation === 'set-build-version') {
    if (!values.appId) {
      throw new Error('Input app-id is required for set-build-version');
    }
    if (!values.buildId) {
      throw new Error('Input build-id is required for set-build-version');
    }
    if (!version) {
      throw new Error('Input version is required for set-build-version');
    }

    const updateResult = await request({
      requestDefinition: OPERATIONS['update-build-image'],
      requestBody: createJsonBody({ version }),
      requestQuery: undefined,
    });

    await outputResult(updateResult, values.buildId);
    return;
  }

  const method = (methodOverride || definition.method).toUpperCase();
  const base64Field = base64FieldInput || definition.base64Field;
  const directBodyInput = operation === 'update-build-image' && version && !bodyInput.trim()
    ? JSON.stringify({ version })
    : bodyInput;
  const mode = createRequestBody.methodsWithoutBody.has(method)
    ? 'none'
    : inferContentMode(contentType, filePath, directBodyInput, bodyFile, base64Field);
  const requestBody = createRequestBody(mode, directBodyInput, bodyFile, filePath, base64Field);
  const requestDefinition = {
    ...definition,
    method,
    path: rawPath || definition.path,
  };
  const result = await request({ requestDefinition, requestBody });
  let buildId = values.buildId;

  try {
    const parsedResponse = JSON.parse(result.responseText || '{}');
    buildId = buildId || parsedResponse.marketplace_image_id || parsedResponse.marketplace_app_build?.id || parsedResponse.id;
  } catch (_error) {
    // Build ID output is best-effort for non-JSON responses.
  }

  await outputResult(result, buildId);
}

createRequestBody.methodsWithoutBody = new Set(['GET', 'HEAD', 'DELETE']);

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
