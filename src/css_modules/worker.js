const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const postcssModules = require('postcss-modules');
const worker = require('@bazel/worker');

function toCamelCase(str) {
  return String(str).replace(/\-(\w)/g, function(all, match) {
    return match.toUpperCase();
  });
}

function writeJsFile(jsFile, cssModuleFile, json) {
  const lines = [`require('/${cssModuleFile}');\n\n`];

  for (const [key, value] of Object.entries(json)) {
    lines.push(`export const ${toCamelCase(key)} = ${JSON.stringify(value)};\n`);
  }

  fs.writeFileSync(jsFile, lines.join(''));
}

const runOneBuild = async ([packageName, input, outputJs, outputCss]) => {
  try {
      const css = fs.readFileSync(path.join(packageName, input));

      const result = await postcss([
        postcssModules({
          root: path.resolve('.'),
          getJSON: (_, json, __) => {
            writeJsFile(
              path.join(packageName, outputJs),
              path.join(packageName, outputCss),
              json);
          },
        }),
      ]).process(css, {
        from: input,
        to: outputCss,
        map: {
          inline: true,
        },
      });

      fs.writeFileSync(path.join(packageName, outputCss), result.css);
    } catch (e) {
      console.error(e);
      return false
    }

      return true;
    }

if (require.main === module) {
  if (worker.runAsWorker(process.argv)) {
    setTimeout(() => {throw new Error()}, 5000)

    worker.runWorkerLoop(runOneBuild);
  } else {
    console.log('Running as a standalone process');

    console.error(
      'Started a new process to perform this action. Your build might be misconfigured, try --strategy=CssModules=worker');

    setTimeout(() => {throw new Error()}, 5000)
    if (!runOneBuild(process.argv.slice(2))) {
      process.exitCode = 1;
    }
  }
}
