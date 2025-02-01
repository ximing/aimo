import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis,
  InputRule,
} from 'prosemirror-inputrules';
import { NodeType, Schema } from 'prosemirror-model';

// 引用块规则: "> "
function blockQuoteRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType);
}

// 有序列表规则: "1. "
function orderedListRule(nodeType: NodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  );
}

// 无序列表规则: "- " 或 "* "
function bulletListRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}

// 代码块规则: "```"
function codeBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^```$/, nodeType);
}

// 标题规则: "# " 到 "###### "
function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp('^(#{1,' + maxLevel + '})\\s$'),
    nodeType,
    (match) => ({ level: match[1].length })
  );
}

// 添加标签规则: "#tag "
function tagRule(nodeType: NodeType) {
  /*
只有以下情况会触发：
行首：#标签
空格后：文本 #标签
不会匹配：文本#标签（没有前导空格）
  */
  return new InputRule(
    /(^|\s)#([\u4e00-\u9fa5\w-]+)(\s)$/,
    (state, match, start, end) => {
      const [fullMatch, beforeSpace, tagContent, afterSpace] = match;
      if (!tagContent) return null;

      const tr = state.tr;

      // 计算正确的替换范围
      const hasBeforeSpace = beforeSpace === ' ';
      const from = hasBeforeSpace ? start + 1 : start;

      // 创建标签节点
      const tagNode = nodeType.create({ name: tagContent });

      // 使用单个事务完成替换
      tr.replaceWith(from, end, tagNode).insertText(' ', from + 1); // 在标签后插入空格

      return tr;
    }
  );
}

export function buildInputRules(schema: Schema) {
  const rules = smartQuotes.concat(ellipsis, emDash);
  let type;
  // const rules = [];

  if ((type = schema.nodes.tag)) {
    rules.push(tagRule(type));
  }
  if ((type = schema.nodes.blockquote)) {
    rules.push(blockQuoteRule(type));
  }
  if ((type = schema.nodes.ordered_list)) {
    rules.push(orderedListRule(type));
  }
  if ((type = schema.nodes.bullet_list)) {
    rules.push(bulletListRule(type));
  }
  if ((type = schema.nodes.code_block)) {
    rules.push(codeBlockRule(type));
  }
  if ((type = schema.nodes.heading)) {
    rules.push(headingRule(type, 6));
  }

  return inputRules({ rules });
}
