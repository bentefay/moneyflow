import { run } from "@optique/run";

import { cli, dispatch } from "../commands";

const parsed = run(cli, {
    programName: "run",
    help: "both",
    completion: "both",
    showDefault: true,
    showChoices: true
});

process.exit(await dispatch(parsed));
