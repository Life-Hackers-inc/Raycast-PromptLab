import { ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoreCommand } from "./utils/types";
import { useCachedState, useFetch } from "@raycast/utils";
import { STORE_ENDPOINT, STORE_KEY } from "./utils/constants";
import CategoryDropdown from "./components/CategoryDropdown";
import { useCommands } from "./hooks/useCommands";
import CommandListDetail from "./components/CommandListDetail";
import RunCommandAction from "./components/actions/RunCommandAction";
import { CopyCommandActionsSection } from "./components/actions/CopyCommandActions";
import { CommandControlsActionsSection } from "./components/actions/CommandControlActions";
import InstallCommandAction from "./components/actions/InstallCommandAction";

export default function Discover() {
  const { commands: myCommands, setCommands: setMyCommands, isLoading: loadingMyCommands } = useCommands();
  const [availableCommands, setAvailableCommands] = useCachedState<StoreCommand[]>("availableCommands", []);
  const [targetCategory, setTargetCategory] = useState<string>("All");

  useEffect(() => {
    // Get installed commands from local storage
    Promise.resolve(LocalStorage.allItems()).then((commandData) => {
      const commandDataFiltered = Object.values(commandData).filter(
        (cmd, index) =>
          !Object.keys(commandData)[index].startsWith("--") && !Object.keys(commandData)[index].startsWith("id-")
      );
      setMyCommands(commandDataFiltered.map((data) => JSON.parse(data)));
    });
  }, []);

  // Get available commands from store
  const { data, isLoading } = useFetch(STORE_ENDPOINT, { headers: { "X-API-KEY": STORE_KEY } });
  useEffect(() => {
    if (data && !isLoading) {
      setAvailableCommands((data as { data: StoreCommand[] })["data"].reverse());
    }
  }, [data, isLoading]);

  const knownPrompts = myCommands?.map((command) => command.prompt);

  const listItems = availableCommands
    .filter((command) => command.categories?.split(", ").includes(targetCategory) || targetCategory == "All")
    .map((command) => (
      <List.Item
        title={command.name}
        icon={{
          source: command.icon,
          tintColor: command.iconColor == undefined ? Color.PrimaryText : command.iconColor,
        }}
        key={command.name}
        accessories={
          knownPrompts?.includes(command.prompt) ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []
        }
        detail={<CommandListDetail command={command} />}
        actions={
          <ActionPanel>
            <InstallCommandAction command={command} commands={myCommands} setCommands={setMyCommands} />
            {command.setupConfig?.length ? null : <RunCommandAction command={command} />}
            <CopyCommandActionsSection command={command} />
            <CommandControlsActionsSection
              command={command}
              availableCommands={availableCommands}
              commands={myCommands}
              setCommands={setMyCommands}
            />
          </ActionPanel>
        }
      />
    ));

  return (
    <List
      isLoading={loadingMyCommands || isLoading}
      isShowingDetail={availableCommands != undefined}
      searchBarPlaceholder="Search PromptLab store..."
      searchBarAccessory={<CategoryDropdown onSelection={setTargetCategory} />}
    >
      <List.EmptyView title="No Custom PromptLab Commands" />
      <List.Section title="Newest Commands">{listItems.slice(0, 5)}</List.Section>
      <List.Section title="————————————————————">{listItems.slice(5)}</List.Section>
    </List>
  );
}
