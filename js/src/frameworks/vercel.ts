import { tool } from "ai";
import { ComposioToolSet as BaseComposioToolSet } from "../sdk/base.toolset";
import { jsonSchemaToModel } from "../utils/shared";

type Optional<T> = T | null;
type Sequence<T> = Array<T>;

export class VercelAIToolSet extends BaseComposioToolSet {
  constructor(config: {
    apiKey?: Optional<string>;
    baseUrl?: Optional<string>;
    entityId?: string;
  }={}) {
    super(
      config.apiKey || null,
      config.baseUrl || null,
      "vercel-ai",
      config.entityId || "default"
    );
  }

  generateVercelTool(schema: any) {
    const parameters = jsonSchemaToModel(schema.parameters);
    return tool({
      description: schema.description,
      parameters,
      execute: async (params: Record<string, string>) => {
        return await this.execute_tool_call({
          name: schema.name,
          arguments: JSON.stringify(params)
        }, this.entityId);
      },
    });
  }

  async get_actions(filters: { actions: Sequence<string>; }): Promise<{ [key: string]: any }> {
    const actionsList = await this.getActionsSchema(filters);
    const tools = {};

    actionsList.forEach(actionSchema => {
      // @ts-ignore
      tools[actionSchema.name!] = this.generateVercelTool(actionSchema);
    });

    return tools;
  }

  // change this implementation
  async getTools(filters: {
    actions?: Array<string>
    apps?: Array<string>;
    tags?: Optional<Array<string>>;
    useCase?: Optional<string>;
  }): Promise<{ [key: string]: any }> {

    const actionsList = await this.client.actions.list({
      ...(filters?.apps && { apps: filters?.apps?.join(",") }),
      ...(filters?.tags && { tags: filters?.tags?.join(",") }),
      ...(filters?.useCase && { useCase: filters?.useCase }),
      ...(filters?.actions && { actions: filters?.actions?.join(",") }),
      ...(filters?.actions && { actions: filters?.actions?.join(",") }),
    });


    const tools = {};
    actionsList.items?.forEach(actionSchema => {
      // @ts-ignore
      tools[actionSchema.name!] = this.generateVercelTool(actionSchema);
    });

    return tools;
  }


  async execute_tool_call(
    tool: { name: string; arguments: unknown; },
    entityId: Optional<string> = null
  ): Promise<string> {
    return JSON.stringify(
      await this.executeAction(
        tool.name,
        typeof tool.arguments === "string" ? JSON.parse(tool.arguments) : tool.arguments,
        entityId || this.entityId
      )
    );
  }

}
