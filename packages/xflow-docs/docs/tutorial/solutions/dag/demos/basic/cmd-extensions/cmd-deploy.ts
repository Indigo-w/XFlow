import { inject, injectable } from 'mana-syringe'
import { XFlowGraphCommands, NsGraphCmd, ICmdHooks as IHooks, NsGraph } from '@antv/xflow'
import { HookHub } from '@antv/xflow-hook'
import { IArgsBase, ICommandHandler, ICommandContextProvider } from '@antv/xflow'
import { CustomCommands } from './constants'

type ICommand = ICommandHandler<
  NsDeployDagCmd.IArgs,
  NsDeployDagCmd.IResult,
  NsDeployDagCmd.ICmdHooks
>

export namespace NsDeployDagCmd {
  /** Command: 用于注册named factory */
  export const command = CustomCommands.DEPLOY_SERVICE
  /** hook name */
  export const hookKey = 'deployDag'
  /** hook 参数类型 */
  export interface IArgs extends IArgsBase {
    deployDagService: IDeployDagService
  }
  export interface IDeployDagService {
    (meta: NsGraph.IGraphMeta, data: NsGraph.IGraphData): Promise<{ success: boolean }>
  }
  /** hook handler 返回类型 */
  export interface IResult {
    success: boolean
  }
  /** hooks 类型 */
  export interface ICmdHooks extends IHooks {
    deployDag: HookHub<IArgs, IResult>
  }
}

@injectable()
/** 部署画布数据 */
export class DeployDagCommand implements ICommand {
  /** api */
  @inject(ICommandContextProvider) contextProvider: ICommand['contextProvider']

  /** 执行Cmd */
  execute = async () => {
    const ctx = this.contextProvider()
    const { args, hooks: runtimeHook } = ctx.getArgs()
    const hooks = ctx.getHooks()

    const result = await hooks.deployDag.call(args, async args => {
      const { commandService, deployDagService } = args
      /** 执行Command */
      await commandService.executeCommand(
        XFlowGraphCommands.SAVE_GRAPH_DATA.id,
        {
          saveGraphDataService: async (meta, graph) => {
            await deployDagService(meta, graph)
          },
        } as NsGraphCmd.SaveGraphData.IArgs,
        runtimeHook,
      )
      return { success: true }
    })

    ctx.setResult(result)
    return this
  }

  /** undo cmd */
  undo = async () => {
    if (this.isUndoable()) {
      const ctx = this.contextProvider()
      ctx.undo()
    }
    return this
  }

  /** redo cmd */
  redo = async () => {
    if (!this.isUndoable()) {
      await this.execute()
    }
    return this
  }

  isUndoable(): boolean {
    const ctx = this.contextProvider()
    return ctx.isUndoable()
  }
}
