#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { runInit } from "./init";

const program = new Command();

program
  .name("magic-translate")
  .description("Auto translation for your app — zero manual work")
  .version("1.0.0");

program
  .command("init")
  .description("Setup magic-translate in your project")
  .action(async () => {
    console.log(chalk.cyan("\n🪄 Magic Translate — Init Starting...\n"));
    await runInit();
  });

program.parse(process.argv);