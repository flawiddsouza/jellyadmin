<template>
    <div class="code-mirror-editor"></div>
</template>

<script>
import { EditorView, keymap, highlightSpecialChars } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { MySQL, PostgreSQL, sql } from '@codemirror/lang-sql'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { indentOnInput, indentUnit, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

const styleOverrides = EditorView.theme({
    '.cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label': {
        fontSize: '1em !important'
    }
})

/**
 * `Mod-Enter` is `Ctrl-Enter` inside codemirror
 * `Ctrl-Enter` hotkey is used to run the current query
 * but codemirror has the same hotkey to add a new line, therefore disable codemirror hotkey
 */
defaultKeymap.find(keyObj => keyObj.key == 'Mod-Enter').run = false

function createState(database, schema, documentText, vueInstance) {
    let dialect

    if(database === 'mysql') {
        dialect = MySQL
    }

    if(database === 'postgresql') {
        dialect = PostgreSQL
    }

    const languageFunc = sql({
        dialect,
        schema
    })

    let highlightStyle = defaultHighlightStyle

    return EditorState.create({
        doc: documentText,
        extensions: [
            languageFunc,
            syntaxHighlighting(highlightStyle, { fallback: true }),
            closeBrackets(),
            bracketMatching(),
            autocompletion(),
            indentOnInput(),
            history(),
            highlightSpecialChars(),
            highlightSelectionMatches(),
            indentUnit.of('    '), // 4 spaces
            EditorView.lineWrapping,
            EditorView.updateListener.of(v => {
                if(v.docChanged) {
                    vueInstance.emitted = true
                    vueInstance.$emit('update:modelValue', v.state.doc.toString())
                }
            }),
            styleOverrides,
            keymap.of([
                ...defaultKeymap,
                ...historyKeymap,
                indentWithTab,
                ...searchKeymap
            ])
        ]
    })
}

export default {
    props: {
        modelValue: {
            type: String,
            required: true
        },
        database: {
            type: String,
            required: true
        },
        schema: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            editor: null,
            emitted: false
        }
    },
    watch: {
        modelValue() {
            if(!this.emitted) {
                this.editor.dispatch({
                    changes: { from: 0, to: this.editor.state.doc.length, insert: this.modelValue }
                })
            } else {
                this.emitted = false
            }
        }
    },
    methods: {
        setValue(value) {
            this.editor.dispatch({
                changes: { from: 0, to: this.editor.state.doc.length, insert: value }
            })
        }
    },
    mounted() {
        this.editor = new EditorView({
            state: createState(this.database, this.schema, this.modelValue, this),
            parent: this.$el
        })
    }
}
</script>

<style>
.code-mirror-editor .cm-editor.cm-focused {
    outline: 0 !important;
}

.code-mirror-editor .cm-gutters {
    user-select: none;
    background-color: inherit;
    border-right: 0;
}

.code-mirror-editor .cm-scroller {
    font-family: var(--font-monospace);
    overflow: auto;
}

.code-mirror-editor .cm-activeLine, .code-mirror-editor .cm-activeLineGutter {
    background-color: rgb(130, 130, 130, 0.1);
}

.code-mirror-editor .cm-foldGutter span {
    font-size: 1.1rem;
    line-height: 1.1rem;
    color: rgb(130, 130, 130, 0.5);
}

.code-mirror-editor .cm-foldGutter span:hover {
    color: #999999;
}

.code-mirror-editor .cm-editor {
    height: 100%;
}
</style>
