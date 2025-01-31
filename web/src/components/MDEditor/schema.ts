import { Schema } from "prosemirror-model";
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  schema,
  MarkdownParser,
  MarkdownSerializer,
} from "prosemirror-markdown";
import { addListNodes } from "prosemirror-schema-list";

const tagNodeSpec = {
  attrs: {
    name: { default: "" },
  },
  group: "inline",
  inline: true,
  atom: true, // 确保节点是原子的，不可分割
  selectable: true, // 允许选择
  draggable: false, // 禁止拖拽
  toDOM: (node) => [
    "span",
    {
      class: "editor-tag",
      "data-tag": node.attrs.name,
      contentEditable: "false",
    },
    "#" + node.attrs.name,
  ],
  parseDOM: [
    {
      tag: "span.editor-tag",
      getAttrs: (dom) => ({
        name: dom.getAttribute("data-tag"),
      }),
    },
  ],
};

// 扩展基础 schema
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block").addToEnd(
    "tag",
    tagNodeSpec
  ),
  marks: schema.spec.marks,
});

// 扩展 Markdown 解析器
const myParser = new MarkdownParser(mySchema, defaultMarkdownParser.tokenizer, {
  ...defaultMarkdownParser.tokens,
  tag: {
    node: "tag",
    getAttrs: (tok) => ({ name: tok.content }),
  },
});

// 扩展 Markdown 序列化器
const mySerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    tag(state, node) {
      state.write(` #${node.attrs.name} `);
    },
  },
  defaultMarkdownSerializer.marks
);

export { mySchema, myParser, mySerializer };
