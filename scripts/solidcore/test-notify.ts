import { sendPushoverNotification } from "./notify";

async function main(): Promise<void> {
  await sendPushoverNotification({
    title: "solidcore watcher test",
    message: "Test push from your local solidcore watcher setup.",
    priority: 1,
    sound: "cosmic",
  });

  console.log("Test notification sent.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
