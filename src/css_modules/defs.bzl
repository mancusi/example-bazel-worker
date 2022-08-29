load("@aspect_rules_js//js:defs.bzl", "js_run_binary", "js_library")
load("@bazel_skylib//rules:write_file.bzl", "write_file")


def css_module(name, src, visibility = None):
    js_file = ":" + src + ".js"
    module_file = ":" + src.replace(".css", ".module.css")
    outputs = [js_file, module_file]
    outputs_without_target = [o.removeprefix(":") for o in outputs]

    _css_module_target = "_" + name
    js_target = "_" + name + "_classnames"


    worker_name = "{}.worker_args".format(_css_module_target)
    write_file(
        name = worker_name,
        content = [
            native.package_name(),
            src,
        ] + outputs_without_target,
        out = "{}.args".format(name),
    )

    js_run_binary(
        name = _css_module_target,
        srcs = [
            ":{}".format(src),
            worker_name,
            "//:node_modules/@bazel/worker",
            "//:node_modules/postcss",
            "//:node_modules/postcss-modules",
        ],
        outs = outputs_without_target,
        args = ["@$(execpath {})".format(worker_name)],
        tool = "//src/css_modules:worker",
        execution_requirements = {"supports-workers": "1"},
        progress_message = "Generating CSS Modules {}".format(src),
        mnemonic = "CssModules",
    )

    js_library(
        name = js_target,
        srcs = [js_file],
        data = [module_file],
        visibility = visibility,
    )

    native.filegroup(
        name = name,
        srcs = [
            _css_module_target,
            js_target,
        ],
        data = [
            js_file,
            module_file,
        ],
        visibility = visibility,
    )
