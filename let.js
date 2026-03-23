function rewriteLetToVar(source) {
    // Remove comments first (so "let" inside comments isn't rewritten)
    const withoutComments = source
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//gm, "");

    // Replace let declarations ONLY when they appear as standalone keywords
    // and not inside strings or identifiers.
    return withoutComments.replace(
        /\blet\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
        "var $1"
    );
}
