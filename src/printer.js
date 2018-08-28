"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const values = require("./values");
const apexNames = values.APEX_NAMES;

// TODO: Check the following places: Expr.class, BlockMember.class
// for possible things that we've forgotten to implement
// Already done: Stmnt.class, NewObject.class

function indentConcat(docs) {
  return indent(concat(docs));
}

function groupConcat(docs) {
  return group(concat(docs));
}

function groupIndentConcat(docs) {
  return group(indent(concat(docs)));
}

function handleReturnStatement(path, print) {
  const docs = [];
  docs.push("return");
  const childDocs = path.call(print, "expr", "value");
  if (childDocs) {
    docs.push(" ");
    docs.push(childDocs);
  }
  docs.push(";");
  return concat(docs);
}

function handleBinaryExpression(path, print) {
  const docs = [];
  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);
  docs.push(" ");
  docs.push(rightDoc);
  return concat(docs);
}

function handleGenericExpression(path, print) {
  const docs = [];
  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);
  docs.push(" ");
  docs.push(rightDoc);
  return concat(docs);
}

function handleVariableExpression(path, print) {
  const parts = [];
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");
  if (dottedExpressionDoc) {
    parts.push(dottedExpressionDoc);
    parts.push(".");
  }
  // Name chain
  const nameDocs = path.map(print, "names");
  parts.push(join(".", nameDocs));
  return concat(parts);
}

function handleLiteralExpression(path, print) {
  const node = path.getValue();
  const literalType = path.call(print, "type", "$");
  if (literalType === "NULL") {
    return "null";
  }
  const literalDoc = path.call(print, "literal", "$");
  if (node.type["$"] === "STRING") {
    return concat(["'", literalDoc, "'"]);
  }
  return literalDoc;
}

function handleBinaryOperation(path) {
  const node = path.getValue();
  return values.BINARY[node["$"]];
}

function handleBooleanOperation(path) {
  const node = path.getValue();
  return values.BOOLEAN[node["$"]];
}

function handleAssignmentOperation(path) {
  const node = path.getValue();
  return values.ASSIGNMENT[node["$"]];
}

function handleTriggerDeclarationUnit(path, print) {
  const usageDocs = path.map(print, "usages");
  const targetDocs = path.map(print, "target");

  const parts = [];
  parts.push("trigger");
  parts.push(" ");
  parts.push(path.call(print, "name", "value"));
  parts.push(" ");
  parts.push("on");
  parts.push(" ");
  parts.push(join(",", targetDocs));
  parts.push("(");
  const usagePart = concat([
    softline,
    join(concat([",", line]), usageDocs),
  ]);
  parts.push(indent(usagePart));
  parts.push(")");
  parts.push(" ");
  parts.push("{");
  const memberParts = path.map(print, "members").filter(member => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline, hardline])
    }
    return memberDoc;
  });
  if(memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(dedent(concat([hardline, "}"])));
  } else {
    parts.push("}");
  }
  return concat(parts);
}

function handleClassDeclaration(path, print) {
  const parts = [];
  const modifierDocs = path.map(print, "modifiers");
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  parts.push("class");
  parts.push(" ");
  parts.push(path.call(print, "name", "value"));
  const superClass = path.call(print, "superClass", "value");
  if (superClass !== "") {
    parts.push(" ");
    parts.push("extends");
    parts.push(" ");
    parts.push(superClass);
  }
  const interfaces = path.map(print, "interfaces");
  if (interfaces.length > 0) {
    parts.push(" ");
    parts.push("implements");
    parts.push(" ");
    parts.push(join(", ", interfaces));
  }
  parts.push(" ");
  parts.push("{");
  const memberParts = path.map(print, "members").filter(member => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline, hardline])
    }
    return memberDoc;
  });
  if(memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(dedent(concat([hardline, "}"])));
  } else {
    parts.push("}");
  }
  return concat(parts);
}

function handleAnnotation(path, print) {
  const parts = [];
  parts.push("@");
  parts.push(path.call(print, "name", "value"));
  const parameterDocs = path.map(print, "parameters");
  if (parameterDocs.length > 0) {
    parts.push("(");
    parts.push(join(", ", parameterDocs));
    parts.push(")");
  }
  parts.push(hardline);
  return concat(parts);
}

function handleAnnotationKeyValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleClassTypeRef(path, print) {
  const parts = [];
  parts.push(join(".", path.map(print, "names")));
  const typeArgumentDocs = path.map(print, "typeArguments");
  if (typeArgumentDocs.length > 0) {
    parts.push("<");
    parts.push(join(", ", typeArgumentDocs));
    parts.push(">");
  }
  return concat(parts);
}

function handleArrayTypeRef(path, print) {
  const parts = [];
  parts.push(path.call(print, "heldType"));
  parts.push("[]");
  return concat(parts);
}

function handleMethodDeclaration(path, print) {
  const statementDoc = path.call(print, "stmnt", "value");
  const modifierDocs = path.map(print, "modifiers");
  const parameterDocs = path.map(print, "parameters");

  const parts = [];
  // Modifiers
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  // Return type
  parts.push(path.call(print, "type", "value"));
  parts.push(" ");
  // Method name
  parts.push(path.call(print, "name"));
  // Params
  parts.push("(");
  parts.push(join(", ", parameterDocs));
  parts.push(")");
  parts.push(" ");
  // Body
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleEmptyModifierParameterRef(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return concat(parts);
}

function handleStatement(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "DmlInsertStmnt":
      doc = "insert";
      break;
    case "DmlUpdateStmnt":
      doc = "update";
      break;
    case "DmlUpsertStmnt":
      doc = "upsert";
      break;
    case "DmlDeleteStmnt":
      doc = "delete";
      break;
    case "DmlUndeleteStmnt":
      doc = "undelete";
      break;
    default:
      doc = "";
  }
  const node = path.getValue();
  const parts = [];
  parts.push(doc);
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  // upsert statement has an extra param that can be tacked on at the end
  if (node.id) {
    _pushIfExist(parts, path.call(print, "id", "value"), null, [line]);
  }
  parts.push(";");
  return groupIndentConcat(parts);
}

function handleDmlMergeStatement(path, print) {
  const parts = [];
  parts.push("merge");
  parts.push(" ");
  parts.push(path.call(print, "expr1"));
  parts.push(line);
  parts.push(path.call(print, "expr2"));
  parts.push(";");
  return groupIndentConcat(parts);
}

function handleEnumDeclaration(path, print) {
  const modifierDocs = path.map(print, "modifiers");
  const memberDocs = path.map(print, "members");

  const parts = [];
  _pushIfExist(parts, join(" ", modifierDocs));
  parts.push("enum");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  parts.push(softline);
  parts.push(join(concat([",", line]), memberDocs));
  parts.push(dedent(softline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleSwitchStatement(path, print) {
  const whenBlocks = path.map(print, "whenBlocks");

  const parts = [];
  parts.push("switch on");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("{");
  parts.push(hardline);
  parts.push(join(hardline, whenBlocks));
  parts.push(dedent(hardline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleValueWhen(path, print) {
  const whenCaseDocs = path.map(print, "whenCases");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  const whenCaseGroup = group(indent(join(concat([",", line]), whenCaseDocs)));
  parts.push(whenCaseGroup);
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleElseWhen(path, print) {
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  parts.push("else");
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleTypeWhen(path, print) {
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleEnumCase(path, print) {
  return join(",", path.map(print, "identifiers"));
}

function handleRunAsBlock(path, print) {
  const paramDocs = path.map(print, "inputParameters");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("System.runAs");
  parts.push("(");
  parts.push(join(concat([",", line]), paramDocs));
  parts.push(")");
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleBlockStatement(path, print) {
  const statementDocs = path.map(print, "stmnts");
  if (statementDocs.length > 0) {
    return join(hardline, statementDocs);
  }
  return "";
}

function handleTryCatchFinallyBlock(path, print) {
  const tryStatementDoc = path.call(print, "tryBlock");
  const catchBlockDocs = path.map(print, "catchBlocks");
  const finallyBlockDoc = path.call(print, "finallyBlock", "value");

  const parts = [];
  parts.push("try");
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, tryStatementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  if (catchBlockDocs.length > 0) {
    // Can't use _pushIfExist here because it doesn't check for Array type
    parts.push(" ");
    parts.push(dedent(join(" ", catchBlockDocs)));
  }
  _pushIfExist(parts, dedent(finallyBlockDoc), null, [" "]);
  return groupIndentConcat(parts);
}

function handleCatchBlock(path, print) {
  const parts = [];
  parts.push("catch");
  parts.push(" ");
  parts.push("(");
  parts.push(path.call(print, "parameter"));
  parts.push(")");
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, path.call(print, "stmnt"), [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleFinallyBlock(path, print) {
  const parts = [];
  parts.push("finally");
  parts.push(" ");
  parts.push("{");
  _pushIfExist(parts, path.call(print, "stmnt"), [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleVariableDeclarations(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "type"));
  parts.push(" ");
  // Variable declarations
  const declarationDocs = path.map(print, "decls");
  if (declarationDocs.length > 1) {
    parts.push(indentConcat(
      [
        join(
          concat([",", line]),
          declarationDocs,
        ),
      ]
    ));
    parts.push(";");
  } else if (declarationDocs.length === 1) {
    parts.push(concat([declarationDocs[0], ";"]));
  }
  return groupConcat(parts);
}

function handleVariableDeclaration(path, print) {
  const parts = [];
  parts.push(path.call(print, "name"));
  const assignmentDocs = path.call(print, "assignment", "value");
  if (assignmentDocs) {
    parts.push(" ");
    parts.push("=");
    parts.push(" ");
    parts.push(assignmentDocs);
  }
  return concat(parts);
}

function handleNewStandard(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "type"));
  // Params
  parts.push("(");
  parts.push(softline);
  const paramDocs = path.map(print, "inputParameters");
  parts.push(join(concat([",", line]), paramDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewKeyValue(path, print) {
  const keyValueDocs = path.map(print, "keyValues");

  const parts = [];
  parts.push(path.call(print, "type"));
  parts.push("(");
  if (keyValueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), keyValueDocs));
    parts.push(dedent(softline));
  }
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNameValueParameter(path, print) {
  const parts = [];
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleMethodCallExpression(path, print) {
  const parts = [];
  // Dotted expression
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");
  if (dottedExpressionDoc) {
    parts.push(dottedExpressionDoc);
    parts.push(".");
  }
  // Method call chain
  const nameDocs = path.map(print, "names");
  parts.push(join(".", nameDocs));
  // Params
  parts.push("(");
  const paramDocs = path.map(print, "inputParameters");
  parts.push(join(", ", paramDocs));
  parts.push(")");
  return concat(parts);
}

function handleNestedExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return concat(parts);
}

function handleNewSetInit(path, print) {
  const parts = [];
  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join(concat([",", " "]), path.map(print, "types")));
  parts.push(">");
  // Param
  parts.push("(");
  parts.push(path.call(print, "expr", "value"));
  parts.push(")");
  return concat(parts);
}

function handleNewSetLiteral(path, print) {
  const valueDocs = path.map(print, "values");

  const parts = [];
  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join(concat([",", " "]), path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewListInit(path, print) {
  // TODO is there a way to preserve the user choice of List<> or []?
  const parts = [];
  // Type
  parts.push(join(".", path.map(print, "types")));
  // Param
  parts.push("[");
  parts.push(path.call(print, "expr", "value"));
  parts.push("]");
  return concat(parts);
}

function handleNewMapInit(path, print) {
  const parts = [];
  parts.push("Map");
  // Type
  parts.push("<");
  const typeDocs = path.map(print, "types");
  parts.push(join(", ", typeDocs));
  parts.push(">");
  parts.push("(");
  parts.push(path.call(print, "expr", "value"));
  parts.push(")");
  return concat(parts);
}

function handleNewMapLiteral(path, print) {
  const valueDocs = path.map(print, "pairs");

  const parts = [];
  // Type
  parts.push("Map");
  parts.push("<");
  const typeGroup = groupConcat([
    softline,
    join(concat([",", line]), path.map(print, "types")),
    softline,
  ]);
  parts.push(typeGroup);
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleMapLiteralKeyValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "key"));
  parts.push(" ");
  parts.push("=>");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleNewListLiteral(path, print) {
  const valueDocs = path.map(print, "values");

  const parts = [];
  // Type
  parts.push(join(".", path.map(print, "types")));
  // Param
  parts.push("[]");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewExpression(path, print) {
  const parts = [];
  parts.push("new");
  parts.push(" ");
  parts.push(path.call(print, "creator"));
  return concat(parts);
}

function handleIfElseBlock(path, print) {
  const parts = [];
  const ifBlockDocs = path.map(print, "ifBlocks");
  parts.push(join(" else ", ifBlockDocs));
  const elseBlockDoc = path.call(print, "elseBlock", "value");
  parts.push(" ");
  parts.push(elseBlockDoc);
  return groupConcat(parts);
}

function handleIfBlock(path, print) {
  const parts = [];
  parts.push("if");
  parts.push(" ");
  // Condition expression
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  parts.push(" ");
  // Body block
  parts.push("{");
  _pushIfExist(parts, path.call(print, "stmnt"), [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleElseBlock(path, print) {
  const parts = [];
  parts.push("else");
  parts.push(" ");
  // Body block
  parts.push("{");
  _pushIfExist(parts, path.call(print, "stmnt"), [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleTernaryExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "condition"));
  parts.push(" ");
  parts.push("?");
  parts.push(" ");
  parts.push(path.call(print, "trueExpr"));
  parts.push(" ");
  parts.push(":");
  parts.push(" ");
  parts.push(path.call(print, "falseExpr"));
  return groupConcat(parts);
}

function handleInstanceOfExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("instanceof");
  parts.push(" ");
  parts.push(path.call(print, "type"));
  return concat(parts);
}

function handleArrayExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "index"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleCastExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "type"));
  parts.push(")");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleExpressionStatement(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(";");
  return concat(parts);
}

function handleSoqlExpression(path, print) {
  const parts = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleSelectInnerQuery(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push(")");
  const aliasDoc = path.call(print, "alias", "value");
  _pushIfExist(parts, aliasDoc, null, [" "]);

  return groupIndentConcat(parts);
}

function handleWhereInnerExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("(");
  parts.push(softline);
  parts.push(path.call(print, "inner"));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleQuery(path, print) {
  const parts = [];
  parts.push(path.call(print, "select"));
  parts.push(path.call(print, "from"));
  _pushIfExist(parts, path.call(print, "where", "value"));
  _pushIfExist(parts, path.call(print, "with", "value"));
  _pushIfExist(parts, path.call(print, "groupBy", "value"));
  _pushIfExist(parts, path.call(print, "orderBy", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "offset", "value"));
  _pushIfExist(parts, path.call(print, "tracking", "value"));
  _pushIfExist(parts, path.call(print, "updateStats", "value"));
  _pushIfExist(parts, path.call(print, "options", "value"));
  return join(line, parts);
}

function handleCaseExpression(path, print) {
  const parts = [];
  const whenBranchDocs = path.map(print, "whenBranches");
  const elseBranchDoc = path.call(print, "elseBranch", "value");
  parts.push("TYPEOF");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(line);
  parts.push(join(line, whenBranchDocs));
  parts.push(line);
  parts.push(elseBranchDoc);
  parts.push(dedent(softline));
  parts.push("END");
  return groupIndentConcat(parts);
}

function handleWhenExpression(path, print) {
  const parts = [];
  parts.push("WHEN");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("THEN");
  parts.push(line);
  const identifierDocs = path.map(print, "identifiers");
  parts.push(join(concat([",", line]), identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleElseExpression(path, print) {
  const parts = [];
  parts.push("ELSE");
  parts.push(" ");
  const identifierDocs = path.map(print, "identifiers");
  parts.push(join(concat([",", line]), identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleColumnClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "SELECT",
      line,
      join(concat([",", line]), path.map(print, "exprs")),
    ]),
  );
  return groupConcat(parts);
}

function handleColumnExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  _pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  return groupConcat(parts);
}

function handleFieldIdentifier(path, print) {
  const parts = [];
  const entity = path.call(print, "entity", "value");
  if (entity) {
    parts.push(entity);
    parts.push(".");
  }
  parts.push(path.call(print, "field"));
  return concat(parts);
}

function handleField(path, print) {
  const functionOneDoc = path.call(print, "function1", "value");
  const functionTwoDoc = path.call(print, "function2", "value");

  const parts = [];
  _pushIfExist(parts, functionOneDoc, ["(", softline]);
  _pushIfExist(parts, functionTwoDoc, ["(", softline]);
  parts.push(path.call(print, "field"));
  if (functionOneDoc) {
    parts.push(dedent(softline));
    parts.push(")");
  }
  if (functionTwoDoc) {
    parts.push(dedent(softline));
    parts.push(")");
  }
  return groupIndentConcat(parts);
}

function handleFromClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "FROM",
      line,
      ...path.map(print, "exprs"),
    ]),
  );
  return groupConcat(parts);
}

function handleFromExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "table"));
  _pushIfExist(parts, path.call(print, "using", "value"), [dedent(softline)], [line]);
  return groupIndentConcat(parts);
}

function handleWhereClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "WHERE",
      line,
      path.call(print, "expr"),
    ])
  );
  return groupConcat(parts);
}

function handleWhereDistanceExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "distance"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleDistanceFunctionExpression(path, print) {
  const parts = [];
  const distanceDocs = [];
  parts.push("DISTANCE");
  parts.push("(");
  parts.push(softline);
  distanceDocs.push(path.call(print, "field"));
  distanceDocs.push(path.call(print, "location"));
  distanceDocs.push("'" + path.call(print, "unit") + "'");
  parts.push(join(concat([",", line]), distanceDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleGeolocationLiteral(path, print) {
  const parts = [];
  const childParts = [];
  parts.push("GEOLOCATION");
  parts.push("(");
  childParts.push(path.call(print, "latitude", "number", "$"));
  childParts.push(path.call(print, "longitude", "number", "$"));
  parts.push(join(concat([",", line]), childParts));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleWithValue(path, print) {
  const parts = [];
  parts.push("WITH");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleWithDataCategories(path, print) {
  const parts = [];
  const categoryDocs = path.map(print, "categories");
  parts.push("WITH DATA CATEGORY");
  parts.push(line);
  parts.push(join(concat([line, "AND", " "]), categoryDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleDataCategory(path, print) {
  const parts = [];
  const categoryDocs = path.map(print, "categories").filter(doc => doc);
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  if (categoryDocs.length > 1) {
    parts.push("(");
  }
  parts.push(softline);
  parts.push(join(concat([",", line]), categoryDocs));
  parts.push(dedent(softline));
  if (categoryDocs.length > 1) {
    parts.push(")");
  }
  return groupIndentConcat(parts);
}

function handleDataCategoryOperator(childClass) {
  return values.DATA_CATEGORY[childClass];
}

function handleWhereOperationExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleWhereOperationExpressions(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("(");
  parts.push(
    indentConcat([
      softline,
      join(
        concat([",", line]), path.map(print, "expr")
      ),
      dedent(softline),
    ])
  );
  parts.push(")");
  return groupConcat(parts);
}

function handleWhereQueryLiteral(childClass, path, print) {
  // TODO Fix escaping special characters
  let doc;
  switch (childClass) {
    case "QueryString":
      doc = concat(["'", path.call(print, "literal"), "'"]);
      break;
    case "QueryNull":
      doc = "null";
      break;
    case "QueryTrue":
      doc = "true";
      break;
    case "QueryFalse":
      doc = "false";
      break;
    case "QueryNumber":
      doc = path.call(print, "literal", "$");
      break;
    case "QueryDateTime":
      // TODO find a way to preserve user's input instead of converting to GMT
      doc = path.call(print, "literal").replace("[GMT]", "");
      break;
    case "QueryDateFormula":
      doc = path.call(print, "dateFormula");
      break;
    default:
      doc = path.call(print, "literal");
  }
  if (doc) {
    return doc;
  }
  return "";
}

function handleWhereCompoundExpression(path, print) {
  const parts = [];
  parts.push("(");
  const operatorDoc = path.call(print, "op");
  const expressionDocs = path.map(print, "expr");
  parts.push(join(concat([line, operatorDoc, " "]), expressionDocs));
  parts.push(")");
  return concat(parts);
}

function handleWhereUnaryExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return concat(parts);
}

function handleColonExpression(path, print) {
  const parts = [];
  parts.push(":");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleOrderByClause(path, print) {
  const parts = [];
  parts.push("ORDER BY");
  parts.push(indentConcat([
    line,
    join(concat([",", line]), path.map(print, "exprs")),
  ]));
  return groupConcat(parts);
}

function handleOrderByExpression(childClass, path, print) {
  const parts = [];
  let expressionField;
  switch (childClass) {
    case "OrderByDistance":
      expressionField = "distance";
      break;
    case "OrderByValue":
      expressionField = "field";
      break;
    default:
      expressionField = "";
  }
  parts.push(path.call(print, expressionField));

  const orderDoc = path.call(print, "order");
  if (orderDoc) {
    parts.push(" ");
    parts.push(orderDoc);
  }
  const nullOrderDoc = path.call(print, "nullOrder");
  if (nullOrderDoc) {
    parts.push(" ");
    parts.push(nullOrderDoc);
  }
  return concat(parts);
}

function handleOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc.line !== -1 && loc.column !== -1) {
    return values.ORDER[childClass];
  }
  return "";
}

function handleNullOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc.line !== -1 && loc.column !== -1) {
    return values.ORDER_NULL[childClass];
  }
  return "";
}

function handleGroupByClause(path, print) {
  const expressionDocs = path.map(print, "exprs");
  const typeDoc = path.call(print, "type", "value");
  const havingDoc = path.call(print, "having", "value");

  const parts = [];
  parts.push("GROUP BY");
  if (typeDoc) {
    parts.push(" ");
    parts.push(typeDoc);
    parts.push("(");
    parts.push(softline);
  } else {
    parts.push(line);
  }
  parts.push(join(concat([",", line]), expressionDocs));
  parts.push(dedent(softline));
  if (typeDoc) {
    parts.push(")");
  }
  if (havingDoc) {
    parts.push(concat([
      line,
      havingDoc,
    ]));
  }
  return groupIndentConcat(parts);
}

function handleGroupByType(childClass) {
  let doc;
  switch (childClass) {
    case "GroupByRollUp":
      doc = "ROLLUP";
      break;
    case "GroupByCube":
      doc = "CUBE";
      break;
    default:
      doc = "";
  }
  return doc;
}

function handleHavingClause(path, print) {
  const parts = [];
  parts.push("HAVING");
  parts.push(line);
  parts.push(path.call(print, "expr"));
  return groupIndentConcat(parts);
}

function handleQueryUsingClause(path, print) {
  const expressionDocs = path.map(print, "exprs");
  const parts = [];
  parts.push("USING");
  parts.push(line);
  parts.push(join(concat([",", line]), expressionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUsing(path, print) {
  return concat([
    path.call(print, "name", "value"),
    " ",
    path.call(print, "field", "value"),
  ]);
}

function handleTrackingType(childClass) {
  let doc;
  switch (childClass) {
    case "ForView":
      doc = "FOR VIEW";
      break;
    case "ForReference":
      doc = "FOR REFERENCE";
      break;
    default:
      doc = "";
  }
  return doc;
}

function handleQueryOption(childClass) {
  let doc;
  switch (childClass) {
    case "LockRows":
      doc = "FOR UPDATE";
      break;
    case "IncludeDeleted":
      doc = "ALL ROWS";
      break;
    default:
      doc = "";
  }
  return doc;
}

function handleUpdateStatsClause(path, print) {
  const optionDocs = path.map(print, "options");
  const parts = [];
  parts.push("UPDATE");
  parts.push(line);
  parts.push(join(concat([",", line]), optionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUpdateStatsOption(childClass) {
  let doc;
  switch (childClass) {
    case "UpdateTracking":
      doc = "TRACKING";
      break;
    case "UpdateViewStat":
      doc = "VIEWSTAT";
      break;
    default:
      doc = "";
  }
  return doc;
}

function handleModifier(childClass) {
  return concat([values.MODIFIER[childClass], " "]);
}

function handlePostfixExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(path.call(print, "op"));
  return concat(parts);
}

function handlePrefixExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handlePostfixOperator(path, print) {
  return values.POSTFIX[path.call(print, "$")];
}

function handlePrefixOperator(path, print) {
  return values.PREFIX[path.call(print, "$")];
}

function handleWhileLoop(path, print) {
  const statementDoc = path.call(print, "stmnt", "value");

  const parts = [];
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(path.call(print, "condition"));
  parts.push(")");
  parts.push(" ");
  // Body
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleDoLoop(path, print) {
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("do");
  parts.push(" ");
  // Body
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  parts.push(" ");
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(path.call(print, "condition"));
  parts.push(")");
  parts.push(";");
  return groupIndentConcat(parts);
}

function handleForLoop(path, print) {
  const forControlDoc = path.call(print, "forControl");
  const statementDoc = path.call(print, "stmnt", "value");

  const parts = [];
  parts.push("for");
  parts.push(" ");
  parts.push("(");
  // For Control
  parts.push(forControlDoc);
  parts.push(")");
  parts.push(" ");
  // Body
  parts.push("{");
  _pushIfExist(parts, statementDoc, [dedent(hardline)], [hardline]);
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleForEnhancedControl(path, print) {
  // See the note in handleForInit to see why we have to do this
  const initDocParts = path.call(print, "init");
  const initDoc = join(concat([":", " "]), initDocParts);

  const parts = [];
  parts.push(path.call(print, "type", "value"));
  parts.push(" ");
  parts.push(initDoc);
  return concat(parts);
}

function handleForCStyleControl(path, print) {
  const initsDoc = path.call(print, "inits", "value");
  const conditionDoc = path.call(print, "condition", "value");
  const controlDoc = path.call(print, "control", "value");

  const parts = [];
  _pushIfExist(parts, initsDoc);
  parts.push(";");
  _pushIfExist(parts, conditionDoc, null, [line]);
  parts.push(";");
  _pushIfExist(parts, controlDoc, null, [line]);
  return groupIndentConcat(parts);
}

function handleForInits(path, print) {
  const typeDoc = path.call(print, "type", "value");
  const initDocsParts = path.map(print, "inits");

  // See the note in handleForInit to see why we have to do this
  const initDocs = initDocsParts.map(initDocParts => join(concat([" ", "=", " "]), initDocParts));

  const parts = [];
  _pushIfExist(parts, typeDoc, [" "]);
  parts.push(join(concat([",", line]), initDocs));
  return groupIndentConcat(parts);
}

function handleForInit(path, print) {
  // This is one of the weird cases that does not really match the way that we print things.
  // ForInit is used by both C style for loop and enhanced for loop, and there's no way to tell
  // which operator we should use for init in this context, for example:
  // for (Integer i = [SELECT COUNT() FROM Contact; i++; i < 10)
  // and
  // for (Contact a: [SELECT Id FROM Contact])
  // have very little differentiation from the POV of the ForInit handler.
  // Therefore, we'll return 2 docs here so the parent can decide what operator to insert between them.
  const nameDocs = path.map(print, "name");

  const parts = [];
  parts.push(join(".", nameDocs));
  parts.push(path.call(print, "expr", "value"));
  return parts;
}

function _handlePassthroughCall(...names) {
  return function(path, print) {
    return path.call(print, ...names);
  }
}

function _pushIfExist(parts, doc, postDocs, preDocs) {
  if (doc) {
    if (preDocs) {
      preDocs.forEach(preDoc => parts.push(preDoc));
    }
    parts.push(doc);
    if (postDocs) {
      postDocs.forEach(postDoc => parts.push(postDoc));
    }
  }
  return parts;
}

function _escapeString(text) {
  // Code from https://stackoverflow.com/a/11716317/477761
  return text.replace(/\\/g, '\\\\')
    .replace(/\u0008/g, '\\b')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\f/g, '\\f')
    .replace(/\r/g, '\\r')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"');
}

const nodeHandler = {};
nodeHandler[apexNames.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[apexNames.IF_BLOCK] = handleIfBlock;
nodeHandler[apexNames.ELSE_BLOCK] = handleElseBlock;
nodeHandler[apexNames.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[apexNames.ASSIGNMENT_OPERATION] = handleAssignmentOperation;
nodeHandler[apexNames.BINARY_OPERATION] = handleBinaryOperation;
nodeHandler[apexNames.BOOLEAN_OPERATION] = handleBooleanOperation;
nodeHandler[apexNames.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[apexNames.STATEMENT_BLOCK_MEMBER] =_handlePassthroughCall("stmnt");
nodeHandler[apexNames.TRIGGER_USAGE] = (path, print) => values.TRIGGER_USAGE[path.call(print, "$")];
nodeHandler[apexNames.TRIGGER_DECLARATION_UNIT] = handleTriggerDeclarationUnit;
nodeHandler[apexNames.CLASS_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexNames.ENUM_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexNames.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[apexNames.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[apexNames.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[apexNames.LOCATION_IDENTIFIER] = _handlePassthroughCall("value");
nodeHandler[apexNames.INNER_CLASS_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexNames.METHOD_MEMBER] = _handlePassthroughCall("methodDecl");
nodeHandler[apexNames.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[apexNames.EMPTY_MODIFIER_PARAMETER_REF] = handleEmptyModifierParameterRef;
nodeHandler[apexNames.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[apexNames.VARIABLE_DECLARATION_STATEMENT] = _handlePassthroughCall("variableDecls");
nodeHandler[apexNames.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[apexNames.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[apexNames.NAME_VALUE_PARAMETER] = handleNameValueParameter;
nodeHandler[apexNames.ANNOTATION] = handleAnnotation;
nodeHandler[apexNames.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[apexNames.ANNOTATION_VALUE] = (childClass) => values.ANNOTATION_VALUE[childClass];
nodeHandler[apexNames.MODIFIER] = handleModifier;
nodeHandler[apexNames.RUN_AS_BLOCK] = handleRunAsBlock;
nodeHandler[apexNames.DO_LOOP] = handleDoLoop;
nodeHandler[apexNames.WHILE_LOOP] = handleWhileLoop;
nodeHandler[apexNames.FOR_LOOP] = handleForLoop;
nodeHandler[apexNames.FOR_C_STYLE_CONTROL] = handleForCStyleControl;
nodeHandler[apexNames.FOR_ENHANCED_CONTROL] = handleForEnhancedControl;
nodeHandler[apexNames.FOR_INITS] = handleForInits;
nodeHandler[apexNames.FOR_INIT] = handleForInit;
nodeHandler[apexNames.POSTFIX_OPERATOR] = handlePostfixOperator;
nodeHandler[apexNames.PREFIX_OPERATOR] = handlePrefixOperator;
nodeHandler[apexNames.BREAK_STATEMENT] = () => "break;";
nodeHandler[apexNames.CONTINUE_STATEMENT] = () => "continue;";
nodeHandler[apexNames.THROW_STATEMENT] = (path, print) => concat(["throw", " ", path.call(print, "expr"), ";"]);
nodeHandler[apexNames.TRY_CATCH_FINALLY_BLOCK] = handleTryCatchFinallyBlock;
nodeHandler[apexNames.CATCH_BLOCK] = handleCatchBlock;
nodeHandler[apexNames.FINALLY_BLOCK] = handleFinallyBlock;
nodeHandler[apexNames.STATEMENT] = handleStatement;
nodeHandler[apexNames.DML_MERGE_STATEMENT] = handleDmlMergeStatement;
nodeHandler[apexNames.INNER_ENUM_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexNames.ENUM_DECLARATION] = handleEnumDeclaration;
nodeHandler[apexNames.SWITCH_STATEMENT] = handleSwitchStatement;
nodeHandler[apexNames.VALUE_WHEN] = handleValueWhen;
nodeHandler[apexNames.ELSE_WHEN] = handleElseWhen;
nodeHandler[apexNames.TYPE_WHEN] = handleTypeWhen;
nodeHandler[apexNames.ENUM_CASE] = handleEnumCase;
nodeHandler[apexNames.LITERAL_CASE] = _handlePassthroughCall("expr");

// Expression
nodeHandler[apexNames.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[apexNames.BOOLEAN_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.ASSIGNMENT_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[apexNames.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[apexNames.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[apexNames.BINARY_EXPRESSION] = handleBinaryExpression;
nodeHandler[apexNames.TRIGGER_VARIABLE_EXPRESSION] = (path, print) => concat(["Trigger", ".", path.call(print, "variable")]);
nodeHandler[apexNames.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[apexNames.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[apexNames.THIS_VARIABLE_EXPRESSION] = () => "this";
nodeHandler[apexNames.SUPER_VARIABLE_EXPRESSION] = () => "super";
nodeHandler[apexNames.POSTFIX_EXPRESSION] = handlePostfixExpression;
nodeHandler[apexNames.PREFIX_EXPRESSION] = handlePrefixExpression;
nodeHandler[apexNames.CAST_EXPRESSION] = handleCastExpression;
nodeHandler[apexNames.INSTANCE_OF_EXPRESSION] = handleInstanceOfExpression;
nodeHandler[apexNames.PACKAGE_VERSION_EXPRESSION] = () => "Package.Version.Request";  // Not sure what this is
nodeHandler[apexNames.ARRAY_EXPRESSION] = handleArrayExpression;
nodeHandler[apexNames.SOQL_EXPRESSION] = handleSoqlExpression;

// New Object Init
nodeHandler[apexNames.NEW_SET_INIT] = handleNewSetInit;
nodeHandler[apexNames.NEW_SET_LITERAL] = handleNewSetLiteral;
nodeHandler[apexNames.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[apexNames.NEW_MAP_INIT] = handleNewMapInit;
nodeHandler[apexNames.NEW_MAP_LITERAL] = handleNewMapLiteral;
nodeHandler[apexNames.MAP_LITERAL_KEY_VALUE] = handleMapLiteralKeyValue;
nodeHandler[apexNames.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[apexNames.NEW_STANDARD] = handleNewStandard;
nodeHandler[apexNames.NEW_KEY_VALUE] = handleNewKeyValue;

// SOQL
nodeHandler[apexNames.QUERY] = handleQuery;
nodeHandler[apexNames.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[apexNames.SELECT_COUNT_CLAUSE] = () => concat(["SELECT", " ", "COUNT()"]);
nodeHandler[apexNames.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[apexNames.SELECT_INNER_QUERY] = handleSelectInnerQuery;
nodeHandler[apexNames.SELECT_CASE_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexNames.CASE_EXPRESSION] = handleCaseExpression;
nodeHandler[apexNames.WHEN_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexNames.WHEN_EXPRESSION] = handleWhenExpression;
nodeHandler[apexNames.CASE_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexNames.ELSE_EXPRESSION] = handleElseExpression;
nodeHandler[apexNames.FIELD] = handleField;
nodeHandler[apexNames.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[apexNames.FROM_CLAUSE] = handleFromClause;
nodeHandler[apexNames.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[apexNames.GROUP_BY_CLAUSE] = handleGroupByClause;
nodeHandler[apexNames.GROUP_BY_EXPRESSION] = _handlePassthroughCall("field");
nodeHandler[apexNames.GROUP_BY_TYPE] = handleGroupByType;
nodeHandler[apexNames.HAVING_CLAUSE] = handleHavingClause;
nodeHandler[apexNames.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[apexNames.WHERE_INNER_EXPRESSION] = handleWhereInnerExpression;
nodeHandler[apexNames.WHERE_OPERATION_EXPRESSION] = handleWhereOperationExpression;
nodeHandler[apexNames.WHERE_OPERATION_EXPRESSIONS] = handleWhereOperationExpressions;
nodeHandler[apexNames.WHERE_COMPOUND_EXPRESSION] = handleWhereCompoundExpression;
nodeHandler[apexNames.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[apexNames.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[apexNames.WHERE_DISTANCE_EXPRESSION] = handleWhereDistanceExpression;
nodeHandler[apexNames.DISTANCE_FUNCTION_EXPRESSION] = handleDistanceFunctionExpression;
nodeHandler[apexNames.GEOLOCATION_LITERAL] = handleGeolocationLiteral;
nodeHandler[apexNames.QUERY_LITERAL_EXPRESSION] = _handlePassthroughCall("literal");
nodeHandler[apexNames.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[apexNames.APEX_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexNames.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[apexNames.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[apexNames.ORDER_BY_EXPRESSION] = handleOrderByExpression;
nodeHandler[apexNames.WITH_VALUE] = handleWithValue;
nodeHandler[apexNames.WITH_DATA_CATEGORIES] = handleWithDataCategories;
nodeHandler[apexNames.DATA_CATEGORY] = handleDataCategory;
nodeHandler[apexNames.DATA_CATEGORY_OPERATOR] = handleDataCategoryOperator;
nodeHandler[apexNames.LIMIT_VALUE] = (path, print) => concat(["LIMIT", " ", path.call(print, "i")]);
nodeHandler[apexNames.OFFSET_VALUE] = (path, print) => concat(["OFFSET", " ", path.call(print, "i")]);
nodeHandler[apexNames.QUERY_OPERATOR] = (childClass) => values.QUERY[childClass];
nodeHandler[apexNames.SOQL_ORDER] = handleOrderOperation;
nodeHandler[apexNames.SOQL_ORDER_NULL] = handleNullOrderOperation;
nodeHandler[apexNames.TRACKING_TYPE] = handleTrackingType;
nodeHandler[apexNames.QUERY_OPTION] = handleQueryOption;
nodeHandler[apexNames.QUERY_USING_CLAUSE] = handleQueryUsingClause;
nodeHandler[apexNames.USING] = handleUsing;
nodeHandler[apexNames.UPDATE_STATS_CLAUSE] = handleUpdateStatsClause;
nodeHandler[apexNames.UPDATE_STATS_OPTION] = handleUpdateStatsOption;
nodeHandler[apexNames.WHERE_COMPOUND_OPERATOR] = (childClass) => values.QUERY_WHERE[childClass];

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (typeof n === "number" || typeof n === "boolean") {
    return n.toString();
  }
  if (typeof n === "string") {
    return _escapeString(n);
  }
  if (!n) {
    return "";
  }
  const apexClass = n["@class"];
  if (path.stack.length === 1) {
    // Hard code how to handle the root node here
    const docs = [];
    docs.push(path.call(print, apexNames.PARSER_OUTPUT, "unit"));
    // Adding a hardline as the last thing in the document
    docs.push(hardline);
    return concat(docs);
  }
  if (!apexClass) {
    return "";
  }
  if (apexClass in nodeHandler) {
    return nodeHandler[apexClass](path, print, options);
  }
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    const childClass = apexClass.substring(separatorIndex + 1);
    if (parentClass in nodeHandler) {
      return nodeHandler[parentClass](childClass, path, print, options);
    }
  }

  return "";
}

module.exports = genericPrint;
