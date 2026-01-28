import type { PluginInput } from "@opencode-ai/plugin"
import { join } from "path"
import { sendMessage } from "../../features/sisyphus-swarm/mailbox/mailbox"
import type { ProtocolMessage } from "../../features/sisyphus-swarm/mailbox/types"

interface EventInput {
  event: {
    type: string
    properties?: {
      sessionID?: string
      agentName?: string
      teamName?: string
      completedTaskId?: string
      completedStatus?: "completed" | "failed"
      failureReason?: string
    }
  }
}

export function createTeammateIdleNotificationHook(_ctx: PluginInput) {
  const eventHandler = async (input: EventInput) => {
    const { event } = input

    if (event.type !== "session.stop") {
      return
    }

    const props = event.properties
    if (!props?.agentName || !props?.teamName) {
      return
    }

    const teamDir = join(process.cwd(), ".sisyphus", "teams", props.teamName)

    const message: ProtocolMessage = {
      type: "idle_notification",
      from: props.agentName,
      timestamp: new Date().toISOString(),
      completedTaskId: props.completedTaskId,
      completedStatus: props.completedStatus,
      failureReason: props.failureReason,
    }

    try {
      sendMessage("leader", message, props.agentName, teamDir)
    } catch {
      // Ignore errors - leader might not exist
    }
  }

  return {
    event: eventHandler,
  }
}
