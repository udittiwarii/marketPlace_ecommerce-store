const { StateGraph, MessagesAnnotation, MemorySaver } = require('@langchain/langgraph');
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ToolMessage, AIMessage, HumanMessage } = require('@langchain/core/messages');
const tools = require("./tools")


const memory = new MemorySaver()

const model = new ChatGoogleGenerativeAI({
    // temperature: 0.5,
    model: "gemini-2.5-flash",
})

const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {
        const lastMessage = state.messages[state.messages.length - 1];

        const toolsCall = lastMessage.tool_calls || [];



        const toolCallResult = Promise.all(toolsCall.map(async (call) => {

            const tool = tools[call.name];


            if (!tool) {
                throw new Error(`Tool ${call.name} are not found`);

            }

            const toolResult = await tool.func({ ...call.args, accessToken: config.metadata.accessToken })

            return new ToolMessage({
                content: toolResult,
                tool_call_id: call.id,
                name: call.name
            })
        }));




        return {
            messages: await toolCallResult
        }
    })
    .addNode("chat", async (state, config) => {
        const response = await model.invoke(state.messages, { tools: [tools.searchProduct, tools.addCart] });

        return {
            messages: [
                new AIMessage({
                    content: response.content,
                    tool_calls: response.tool_calls
                })
            ]
        }
    })
    .setEntryPoint("chat")
    .addConditionalEdges("chat", async (state) => {
        const lastMessage = state.messages[state.messages.length - 1];

        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return "tools"
        } else {
            return "end"
        }
    })
    .addEdge("tools", "chat");


const agent = graph.compile({
    checkpointer: memory,
     recursionLimit: 5
});


module.exports = agent;
