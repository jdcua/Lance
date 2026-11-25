/**
 * Command registry — single typed hub for app-wide actions.
 *
 * Replaces the implicit `lance:...` CustomEvent bus (32 dispatch sites across
 * 15 files). Before this, callers had to know event names and timing by
 * convention; now every command is declared here with its payload type, and
 * handlers subscribe in one place (App.tsx engines). CommandPalette, Sidebar,
 * and screens all draw from the same registry instead of keeping duplicate
 * action lists.
 */
type CommandDetail = {
  'lance:add-time': undefined;
  'lance:open-import': undefined;
  'lance:toggle-timer': undefined;
  'lance:open-command': undefined;
  'lance:add-client': undefined;
  'lance:add-invoice': undefined;
  'lance:add-project': undefined;
  'lance:add-contract': undefined;
  'lance:add-expense': undefined;
  'lance:edit-client': string;
  'lance:prefs-changed': undefined;
};

export type CommandName = keyof CommandDetail;
type CommandHandler<K extends CommandName> = (detail: CommandDetail[K]) => void;

export class CommandRegistry {
  private handlers = new Map<CommandName, Set<CommandHandler<CommandName>>>();
  private pending = new Map<CommandName, CommandDetail[CommandName]>();

  /** Dispatch now if a handler is mounted, otherwise run it when one mounts. */
  dispatchAfterMount<K extends CommandName>(name: K, detail?: CommandDetail[K]): void {
    if (this.handlers.get(name)?.size) {
      this.dispatch(name, detail);
      return;
    }
    this.pending.set(name, detail as CommandDetail[CommandName]);
  }

  on<K extends CommandName>(name: K, handler: CommandHandler<K>): void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as CommandHandler<CommandName>);
    // A queued intent (e.g. "open add-client" from a deep link) is delivered
    // when its owning screen mounts, replacing setTimeout wait-and-hope.
    if (this.pending.has(name)) {
      const detail = this.pending.get(name);
      this.pending.delete(name);
      this.dispatch(name, detail as CommandDetail[K]);
    }
  }

  off<K extends CommandName>(name: K, handler: CommandHandler<K>): void {
    this.handlers.get(name)?.delete(handler as CommandHandler<CommandName>);
  }

  dispatch<K extends CommandName>(name: K, detail?: CommandDetail[K]): void {
    this.handlers.get(name)?.forEach((h) => h(detail as CommandDetail[K]));
  }
}

export const commands = new CommandRegistry();
