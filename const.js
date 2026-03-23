function rewriteConstToVar(source) {
    // Remove comments so "const" inside comments isn't rewritten
    var withoutComments = source
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//gm, "");

    // Replace const declarations ONLY when they appear as standalone keywords
    return withoutComments.replace(
        /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
        "var $1"
    );
}
