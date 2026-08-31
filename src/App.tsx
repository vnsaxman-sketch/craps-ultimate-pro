import { useState } from "react";

/*
 * ============================================================
 * CRAPS ULTIMATE PRO
 * TypeScript + Vite + React
 *
 * SESSION DEFINITION:
 *     1 session = exactly 20 shooters
 *
 * Each shooter continues until:
 *     - Point is made
 *     - Shooter seven-outs
 *
 * Strategies:
 *
 *     1. ACROSS REGRESSION
 *     2. 1-HIT 6/8 REGRESS
 *     3. HEDGE (DP + 6/8)
 *     4. PURE DARK SIDE
 *     5. IRON CROSS
 * ============================================================
 */


/* ============================================================
   TYPES
============================================================ */

type StrategyName =
  | "ACROSS REGRESSION"
  | "1-HIT 6/8 REGRESS"
  | "HEDGE (DP + 6/8)"
  | "PURE DARK SIDE"
  | "IRON CROSS";

interface RollResult {
  shooterNumber: number;
  rollNumber: number;

  die1: number;
  die2: number;

  total: number;

  point: number | null;
}

interface ShooterResult {
  shooterNumber: number;

  rolls: RollResult[];

  totalRolls: number;

  point: number | null;

  sevenOut: boolean;
}

interface SessionResult {
  sessionNumber: number;

  startingBankroll: number;

  endingBankroll: number;

  profit: number;

  totalRolls: number;

  totalShooters: number;

  shooters: ShooterResult[];
}

interface StrategyResult {
  name: StrategyName;

  averageFinal: number;

  bustPercent: number;

  maxFinal: number;

  minFinal: number;

  averageProfit: number;

  profitPercent: number;

  averageRolls: number;

  averageShooters: number;

  outcome:
    | "PROFIT"
    | "DEFICIT";
}


/* ============================================================
   CONSTANTS
============================================================ */

const SHOOTERS_PER_SESSION = 20;


/*
 * Iron Cross:
 *
 * $10 Field
 * $10 Place 5
 * $12 Place 6
 * $12 Place 8
 *
 * Total = $44
 *
 * Standard place payouts:
 *
 * 10 = 14:10
 * 6 = 14:12
 * 8 = 14:12
 *
 * Field:
 *
 * 2 = 2:1
 * 12 = 2:1
 * 3,4,9,10,11 = 1:1
 *
 * 5/6/8 are NOT Field wins.
 */
const IRON_CROSS_BET = 10;

const IRON_CROSS_INITIAL_EXPOSURE =
  IRON_CROSS_BET * 4;


/* ============================================================
   DICE
============================================================ */

function rollDice(): {
  die1: number;
  die2: number;
  total: number;
} {

  const die1 =
    Math.floor(
      Math.random() * 6
    ) + 1;

  const die2 =
    Math.floor(
      Math.random() * 6
    ) + 1;

  return {
    die1,
    die2,
    total: die1 + die2,
  };
}


/* ============================================================
   SHOOTER ENGINE
============================================================ */

function simulateShooter(
  shooterNumber: number,
  startingRollNumber: number
): ShooterResult {

  const rolls: RollResult[] = [];

  let point: number | null = null;

  let rollNumber =
    startingRollNumber;


  while (true) {

    const dice =
      rollDice();

    rollNumber++;


    const roll: RollResult = {
      shooterNumber,

      rollNumber,

      die1: dice.die1,

      die2: dice.die2,

      total: dice.total,

      point,
    };


    rolls.push(roll);


    /*
     * --------------------------------------------------------
     * COME-OUT
     * --------------------------------------------------------
     */

    if (point === null) {

      /*
       * Natural.
       */
      if (
        dice.total === 7 ||
        dice.total === 11
      ) {

        break;
      }


      /*
       * Craps.
       *
       * Shooter continues.
       */
      if (
        dice.total === 2 ||
        dice.total === 3 ||
        dice.total === 12
      ) {

        continue;
      }


      /*
       * Establish point.
       */
      if (
        [
          4,
          5,
          6,
          8,
          9,
          10,
        ].includes(
          dice.total
        )
      ) {

        point =
          dice.total;
      }


      continue;
    }


    /*
     * --------------------------------------------------------
     * POINT PHASE
     * --------------------------------------------------------
     */

    /*
     * Point made.
     */
    if (
      dice.total === point
    ) {

      break;
    }


    /*
     * Seven-out.
     */
    if (
      dice.total === 7
    ) {

      break;
    }


    /*
     * Otherwise shooter continues.
     */
  }


  const lastRoll =
    rolls[
      rolls.length - 1
    ];


  return {

    shooterNumber,

    rolls,

    totalRolls:
      rolls.length,

    point,

    sevenOut:
      lastRoll.total === 7 &&
      point !== null,
  };
}


/* ============================================================
   STRATEGY #1
   ACROSS REGRESSION
============================================================ */

function simulateAcrossRegression(
  bankroll: number
): SessionResult {

  let balance =
    bankroll;

  let globalRollNumber =
    0;

  const shooters:
    ShooterResult[] = [];


  for (
    let shooterNumber = 1;

    shooterNumber <=
      SHOOTERS_PER_SESSION;

    shooterNumber++
  ) {

    if (
      balance <= 0
    ) {

      break;
    }


    let bet = 160;

    let hits = 0;


    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );


    globalRollNumber +=
      shooter.totalRolls;


    for (
      const roll
      of shooter.rolls
    ) {

      if (
        balance < bet
      ) {

        break;
      }


      if (
        roll.total === 7
      ) {

        balance -=
          bet;

        break;
      }


      if (
        [
          4,
          5,
          6,
          8,
          9,
          10,
        ].includes(
          roll.total
        )
      ) {

        balance +=
          30;

        hits++;


        if (
          hits === 2
        ) {

          bet = 44;
        }


        if (
          hits >= 6
        ) {

          break;
        }
      }
    }


    shooters.push(
      shooter
    );
  }


  return {

    sessionNumber: 1,

    startingBankroll:
      bankroll,

    endingBankroll:
      balance,

    profit:
      balance - bankroll,

    totalRolls:
      globalRollNumber,

    totalShooters:
      shooters.length,

    shooters,
  };
}


/* ============================================================
   STRATEGY #2
   1-HIT 6/8 REGRESSION
============================================================ */

function simulateOneHitRegression(
  bankroll: number
): SessionResult {

  let balance =
    bankroll;

  let globalRollNumber =
    0;

  const shooters:
    ShooterResult[] = [];


  for (
    let shooterNumber = 1;

    shooterNumber <=
      SHOOTERS_PER_SESSION;

    shooterNumber++
  ) {

    if (
      balance < 120
    ) {

      break;
    }


    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );


    globalRollNumber +=
      shooter.totalRolls;


    for (
      const roll
      of shooter.rolls
    ) {

      if (
        balance < 120
      ) {

        break;
      }


      if (
        roll.total === 7
      ) {

        balance -=
          120;

        break;
      }


      if (
        roll.total === 6 ||
        roll.total === 8
      ) {

        balance +=
          58;

        break;
      }
    }


    shooters.push(
      shooter
    );
  }


  return {

    sessionNumber: 1,

    startingBankroll:
      bankroll,

    endingBankroll:
      balance,

    profit:
      balance - bankroll,

    totalRolls:
      globalRollNumber,

    totalShooters:
      shooters.length,

    shooters,
  };
}


/* ============================================================
   STRATEGY #3
   HEDGE (DP + 6/8)
============================================================ */

function simulateHedgeCombo(
  bankroll: number
): SessionResult {

  let balance =
    bankroll;

  let globalRollNumber =
    0;

  const shooters:
    ShooterResult[] = [];


  for (
    let shooterNumber = 1;

    shooterNumber <=
      SHOOTERS_PER_SESSION;

    shooterNumber++
  ) {

    if (
      balance < 34
    ) {

      break;
    }


    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );


    globalRollNumber +=
      shooter.totalRolls;


    for (
      let i = 0;
      i < shooter.rolls.length;
      i++
    ) {

      if (
        balance < 34
      ) {

        break;
      }


      const d =
        shooter.rolls[i].total;


      if (
        d === 7 ||
        d === 11
      ) {

        balance -=
          10;

        continue;
      }


      if (
        d === 2 ||
        d === 3
      ) {

        balance +=
          10;

        continue;
      }


      if (
        [
          4,
          5,
          6,
          8,
          9,
          10,
        ].includes(d)
      ) {

        const dpBet =
          10;

        let b6 =
          12;

        let b8 =
          12;


        for (
          let j = i + 1;
          j < shooter.rolls.length;
          j++
        ) {

          const r =
            shooter.rolls[j].total;


          if (
            r === 7
          ) {

            balance +=
              dpBet -
              (b6 + b8);

            break;
          }


          if (
            r === 6 ||
            r === 8
          ) {

            balance +=
              14;

            b6 = 0;

            b8 = 0;
          }


          if (
            r === d
          ) {

            balance -=
              dpBet;

            break;
          }
        }


        break;
      }
    }


    shooters.push(
      shooter
    );
  }


  return {

    sessionNumber: 1,

    startingBankroll:
      bankroll,

    endingBankroll:
      balance,

    profit:
      balance - bankroll,

    totalRolls:
      globalRollNumber,

    totalShooters:
      shooters.length,

    shooters,
  };
}


/* ============================================================
   STRATEGY #4
   PURE DARK SIDE
============================================================ */

function simulateDarkSide(
  bankroll: number
): SessionResult {

  let balance =
    bankroll;

  let globalRollNumber =
    0;

  const shooters:
    ShooterResult[] = [];


  for (
    let shooterNumber = 1;

    shooterNumber <=
      SHOOTERS_PER_SESSION;

    shooterNumber++
  ) {

    if (
      balance < 10
    ) {

      break;
    }


    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );


    globalRollNumber +=
      shooter.totalRolls;


    for (
      let i = 0;
      i < shooter.rolls.length;
      i++
    ) {

      if (
        balance < 10
      ) {

        break;
      }


      const d =
        shooter.rolls[i].total;


      if (
        d === 7 ||
        d === 11
      ) {

        balance -=
          10;

        continue;
      }


      if (
        d === 2 ||
        d === 3
      ) {

        balance +=
          10;

        continue;
      }


      if (
        [
          4,
          5,
          6,
          8,
          9,
          10,
        ].includes(d)
      ) {

        for (
          let j = i + 1;
          j < shooter.rolls.length;
          j++
        ) {

          const subsequent =
            shooter.rolls[j].total;


          if (
            subsequent === 7
          ) {

            balance +=
              10;

            break;
          }


          if (
            subsequent === d
          ) {

            balance -=
              10;

            break;
          }
        }
      }
    }


    shooters.push(
      shooter
    );
  }


  return {

    sessionNumber: 1,

    startingBankroll:
      bankroll,

    endingBankroll:
      balance,

    profit:
      balance - bankroll,

    totalRolls:
      globalRollNumber,

    totalShooters:
      shooters.length,

    shooters,
  };
}


/* ============================================================
   STRATEGY #5
   IRON CROSS
============================================================ */

/*
 * ------------------------------------------------------------
 * IRON CROSS BETS
 * ------------------------------------------------------------
 *
 * Field       = $10
 * Place 5     = $10
 * Place 6     = $12
 * Place 8     = $12
 *
 * Initial exposure = $44
 *
 *
 * PAYOUTS
 * ------------------------------------------------------------
 *
 * FIELD:
 *
 * 2  -> +$20
 * 12 -> +$20
 *
 * 3,4,9,10,11 -> +$10
 *
 *
 * PLACE 5:
 *
 * 5 -> +$14
 *
 *
 * PLACE 6:
 *
 * 6 -> +$14
 *
 *
 * PLACE 8:
 *
 * 8 -> +14
 *
 *
 * 7:
 *
 * Field loses $10
 * Place 5 loses $10
 * Place 6 loses $12
 * Place 8 loses $12
 *
 * Total loss = $44
 *
 *
 * IMPORTANT:
 *
 * This is a simplified continuous Iron Cross
 * simulation for strategy comparison.
 *
 * Exact casino implementation can later add:
 *
 * - Field re-bet rules
 * - Place-bet working/Off behavior
 * - Pressing
 * - Regression
 * - Buy 4 / 10
 * - Different Field amounts
 * - Different unit sizes
 * ============================================================
 */

function simulateIronCross(
  bankroll: number
): SessionResult {

  let balance =
    bankroll;

  let globalRollNumber =
    0;

  const shooters:
    ShooterResult[] = [];


  for (
    let shooterNumber = 1;

    shooterNumber <=
      SHOOTERS_PER_SESSION;

    shooterNumber++
  ) {

    /*
     * Need $44 to establish
     * the Iron Cross.
     */
    if (
      balance <
      IRON_CROSS_INITIAL_EXPOSURE
    ) {

      break;
    }


    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );


    globalRollNumber +=
      shooter.totalRolls;


    /*
     * --------------------------------------------------------
     * IRON CROSS
     * --------------------------------------------------------
     *
     * We establish the bets when the
     * shooter reaches a point number.
     *
     * For simplicity, the bets are
     * evaluated on the shooter's rolls.
     * --------------------------------------------------------
     */

    let ironCrossActive =
      false;


    /*
     * Track whether the point has
     * been established.
     */
    for (
      let i = 0;
      i < shooter.rolls.length;
      i++
    ) {

      const roll =
        shooter.rolls[i];


      /*
       * ------------------------------------------------------
       * COME-OUT
       * ------------------------------------------------------
       */

      if (
        roll.point === null
      ) {

        /*
         * No Iron Cross yet.
         *
         * Once a point is established,
         * activate the Iron Cross.
         */
        continue;
      }


      /*
       * Point exists.
       */
      if (
        !ironCrossActive
      ) {

        if (
          balance <
          IRON_CROSS_INITIAL_EXPOSURE
        ) {

          break;
        }


        /*
         * Place the four bets.
         *
         * We subtract the initial exposure
         * from bankroll.
         */
        balance -=
          IRON_CROSS_INITIAL_EXPOSURE;

        ironCrossActive =
          true;
      }


      /*
       * ------------------------------------------------------
       * RESOLVE ROLL
       * ------------------------------------------------------
       */

      const total =
        roll.total;


      /*
       * 7
       *
       * All four bets lose.
       */
      if (
        total === 7
      ) {

        /*
         * Bets have already been
         * removed from bankroll.
         *
         * No payout.
         */
        ironCrossActive =
          false;

        break;
      }


      /*
       * FIELD NUMBERS
       *
       * 2,3,4,9,10,11,12
       */
      if (
        total === 2
      ) {

        /*
         * Field pays 2:1.
         *
         * Return original $10
         * plus $20 winnings.
         */
        balance +=
          IRON_CROSS_BET * 3;

        /*
         * The Field is re-established
         * for the next roll.
         */
      }


      else if (
        total === 12
      ) {

        /*
         * Field 12 pays 2:1.
         */
        balance +=
          IRON_CROSS_BET * 3;
      }


      else if (
        total === 3 ||
        total === 4 ||
        total === 9 ||
        total === 10 ||
        total === 11
      ) {

        /*
         * Field pays 1:1.
         *
         * Return original $10
         * plus $10 winnings.
         */
        balance +=
          IRON_CROSS_BET * 2;
      }


      /*
       * PLACE 5
       */
      else if (
        total === 5
      ) {

        /*
         * 5 pays 14:10.
         *
         * Return:
         *
         * $10 original
         * + $14 winnings
         *
         * = $24
         */
        balance +=
          IRON_CROSS_BET +
          14;
      }


      /*
       * PLACE 6
       */
      else if (
        total === 6
      ) {

        /*
         * 6 pays 14:12
         *
         * $12 wager:
         *
         * $12original
         * + $13.666 theoretical win
         *
         * Real casinos generally use
         * whole-dollar payout conventions.
         *
         * We use the standard $12 payout
         * for a $12 place bet approximation,
         * but because this strategy uses
         * $10 units we round to $12 here.
         */
        balance +=
          IRON_CROSS_BET +
         14;
      }


      /*
       * PLACE 8
       */
      else if (
        total === 8
      ) {

        /*
         * Same as 6.
         */
        balance +=
          IRON_CROSS_BET +
          14;
      }


      /*
       * Point made:
       *
       * Shooter ends.
       *
       * Iron Cross ends with the shooter.
       */
      if (
        shooter.point !== null &&
        total === shooter.point
      ) {

        ironCrossActive =
          false;

        break;
      }
    }


    shooters.push(
      shooter
    );
  }


  return {

    sessionNumber: 1,

    startingBankroll:
      bankroll,

    endingBankroll:
      balance,

    profit:
      balance - bankroll,

    totalRolls:
      globalRollNumber,

    totalShooters:
      shooters.length,

    shooters,
  };
}


/* ============================================================
   STRATEGY MAP
============================================================ */

const strategyFunctions:
  Record<
    StrategyName,
    (
      bankroll: number
    ) => SessionResult
  > = {

    "ACROSS REGRESSION":
      simulateAcrossRegression,

    "1-HIT 6/8 REGRESS":
      simulateOneHitRegression,

    "HEDGE (DP + 6/8)":
      simulateHedgeCombo,

    "PURE DARK SIDE":
      simulateDarkSide,

    "IRON CROSS":
      simulateIronCross,
  };


/* ============================================================
   MAIN APP
============================================================ */

function App() {

  const [
    startBankroll,
    setStartBankroll,
  ] =
    useState<number>(1000);


  const [
    sessions,
    setSessions,
  ] =
    useState<number>(2);


  const [
    results,
    setResults,
  ] =
    useState<
      StrategyResult[]
    >([]);


  const [
    isRunning,
    setIsRunning,
  ] =
    useState<boolean>(false);


  /* ==========================================================
     FORMAT CURRENCY
  ========================================================== */

  const formatCurrency =
    (
      value: number
    ): string => {

      return value.toLocaleString(
        "en-US",
        {
          style: "currency",

          currency: "USD",

          minimumFractionDigits: 2,

          maximumFractionDigits: 2,
        }
      );
    };


  /* ==========================================================
     RUN SIMULATIONS
  ========================================================== */

  const runSimulations =
    () => {

      if (
        !Number.isFinite(
          startBankroll
        ) ||
        startBankroll <= 0
      ) {

        alert(
          "Starting bankroll must be greater than $0."
        );

        return;
      }


      if (
        !Number.isFinite(
          sessions
        ) ||
        sessions < 1
      ) {

        alert(
          "Simulated sessions must be at least 1."
        );

        return;
      }


      setIsRunning(
        true
      );


      setTimeout(
        () => {

          const strategyResults:
            StrategyResult[] = [];


          const strategyNames:
            StrategyName[] = [

              "ACROSS REGRESSION",

              "1-HIT 6/8 REGRESS",

              "HEDGE (DP + 6/8)",

              "PURE DARK SIDE",

              "IRON CROSS",

            ];


          for (
            const strategyName
            of strategyNames
          ) {

            const simulationFunction =
              strategyFunctions[
                strategyName
              ];


            const finalBankrolls:
              number[] = [];


            const profits:
              number[] = [];


            let totalRolls =
              0;


            let totalShooters =
              0;


            /*
             * Monte Carlo
             */
            for (
              let session = 0;

              session <
                sessions;

              session++
            ) {

              const result =
                simulationFunction(
                  startBankroll
                );


              finalBankrolls.push(
                result.endingBankroll
              );


              profits.push(
                result.profit
              );


              totalRolls +=
                result.totalRolls;


              totalShooters +=
                result.totalShooters;
            }


            /*
             * Average final bankroll
             */
            const averageFinal =
              finalBankrolls.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,

                0
              ) /
              sessions;


            /*
             * Bust
             */
            const bustCount =
              finalBankrolls.filter(
                value =>
                  value <= 0
              ).length;


            const bustPercent =
              (
                bustCount /
                sessions
              ) *
              100;


            /*
             * Maximum
             */
            const maxFinal =
              Math.max(
                ...finalBankrolls
              );


            /*
             * Minimum
             */
            const minFinal =
              Math.min(
                ...finalBankrolls
              );


            /*
             * Average profit
             */
            const averageProfit =
              profits.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,

                0
              ) /
              sessions;


            /*
             * Profitable sessions
             */
            const profitableSessions =
              profits.filter(
                value =>
                  value > 0
              ).length;


            const profitPercent =
              (
                profitableSessions /
                sessions
              ) *
              100;


            /*
             * Average rolls
             */
            const averageRolls =
              totalRolls /
              sessions;


            /*
             * Average shooters
             */
            const averageShooters =
              totalShooters /
              sessions;


            const outcome =
              averageFinal >
              startBankroll
                ? "PROFIT"
                : "DEFICIT";


            strategyResults.push({

              name:
                strategyName,

              averageFinal,

              bustPercent,

              maxFinal,

              minFinal,

              averageProfit,

              profitPercent,

              averageRolls,

              averageShooters,

              outcome,

            });
          }


          setResults(
            strategyResults
          );


          setIsRunning(
            false
          );

        },

        50
      );
    };


  /* ==========================================================
     CLEAR
  ========================================================== */

  const clearResults =
    () => {

      setResults(
        []
      );
    };


  /* ==========================================================
     TERMINAL OUTPUT
  ========================================================== */

  const terminalText =
    (): string => {

      if (
        results.length === 0
      ) {

        return [

          "CRAPS ULTIMATE PRO",

          "",

          "READY TO RUN SIMULATION",

          "",

          `SESSION = ${SHOOTERS_PER_SESSION} SHOOTERS`,

          "",

          "IRON CROSS:",

          "  $10 Field",

          "  $10 Place 5",

          "  $12 Place 6",

          "  $12 Place 8",

          "  Total Exposure = $44",

          "",

          "Enter bankroll and number of",

          "Monte Carlo sessions.",

        ].join(
          "\n"
        );
      }


      const lines:
        string[] = [];


      lines.push(
        "CRAPS ULTIMATE PRO -- GLOBAL PROFIT ANALYSIS"
      );


      lines.push("");


      lines.push(
        `STARTING BANKROLL : ${formatCurrency(
          startBankroll
        )}`
      );


      lines.push(
        `SIMULATED SESSIONS: ${sessions.toLocaleString()}`
      );


      lines.push(
        `SHOOTERS / SESSION: ${SHOOTERS_PER_SESSION}`
      );


      lines.push("");


      lines.push(
        "STRATEGY".padEnd(27) +
        " | " +
        "AVG FINAL".padEnd(14) +
        " | " +
        "BUST %".padEnd(9) +
        " | " +
        "MAX FINAL".padEnd(14) +
        " | " +
        "OUTCOME"
      );


      lines.push(
        "-".repeat(
          110
        )
      );


      for (
        const result
        of results
      ) {

        const strategy =
          result.name.padEnd(
            27
          );


        const average =
          formatCurrency(
            result.averageFinal
          ).padEnd(
            14
          );


        const bust =
          `${result.bustPercent.toFixed(
            1
          )}%`.padEnd(
            9
          );


        const maximum =
          formatCurrency(
            result.maxFinal
          ).padEnd(
            14
          );


        lines.push(
          `${strategy} | ${average} | ${bust} | ${maximum} | ${result.outcome}`
        );
      }


      lines.push("");


      lines.push(
        "ADDITIONAL STATISTICS"
      );


      lines.push(
        "-".repeat(
          110
        )
      );


      for (
        const result
        of results
      ) {

        lines.push(
          `${result.name}:`
        );


        lines.push(
          `  Average Profit  : ${formatCurrency(
            result.averageProfit
          )}`
        );


        lines.push(
          `  Profit Sessions : ${result.profitPercent.toFixed(
            1
          )}%`
        );


        lines.push(
          `  Min Final       : ${formatCurrency(
            result.minFinal
          )}`
        );


        lines.push(
          `  Max Final       : ${formatCurrency(
            result.maxFinal
          )}`
        );


        lines.push(
          `  Average Rolls   : ${result.averageRolls.toFixed(
            1
          )}`
        );


        lines.push(
          `  Average Shooters: ${result.averageShooters.toFixed(
            1
          )}`
        );


        lines.push("");
      }


      lines.push(
        "SIMULATION COMPLETE."
      );


      return lines.join(
        "\n"
      );
    };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="app">

      <div className="app-container">

        {/* HEADER */}

        <header className="header">

          <h1>
            🎲 Craps Ultimate Pro
          </h1>
	  
	  <p className="subtitle">
	    Developed by: Long Nguyen
          </p>

          <p className="subtitle">

            Global Profit Analysis &
            Monte Carlo Simulator

          </p>

        </header>


        {/* CONTROLS */}

        <section className="control-panel">

          <div className="form-group">

            <label htmlFor="bankroll">

              Starting Bankroll ($)

            </label>


            <input
              id="bankroll"

              type="number"

              min="1"

              step="1"

              value={
                startBankroll
              }

              onChange={
                event =>
                  setStartBankroll(
                    Number(
                      event.target.value
                    )
                  )
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="sessions">

              Simulated Sessions

            </label>


            <input
              id="sessions"

              type="number"

              min="1"

              step="1"

              value={
                sessions
              }

              onChange={
                event =>
                  setSessions(
                    Number(
                      event.target.value
                    )
                  )
              }
            />

          </div>


          {/* SESSION */}

          <div className="session-info">

            <strong>
              Session Definition
            </strong>


            <p>

              Each simulated session
              contains exactly{" "}

              <strong>
                {SHOOTERS_PER_SESSION}
                {" "}shooters
              </strong>
              .

            </p>


            <p>

              Each shooter continues
              until the point is made
              or the shooter seven-outs.

            </p>


            <p>

              Therefore the number of
              rolls varies from session
              to session.

            </p>

          </div>


          {/* BUTTONS */}

          <div className="button-row">

            <button
              className="run-button"

              onClick={
                runSimulations
              }

              disabled={
                isRunning
              }
            >

              {isRunning
                ? "⏳ RUNNING..."
                : "▶ RUN GLOBAL PROFIT ANALYSIS"}

            </button>


            <button
              className="clear-button"

              onClick={
                clearResults
              }

              disabled={
                isRunning
              }
            >

              CLEAR

            </button>

          </div>

        </section>


        {/* STRATEGIES */}

        <section className="strategy-panel">

          <h2>
            Strategies Being Tested
          </h2>


          <div className="strategy-grid">

            <div className="strategy-card">

              <span className="strategy-number">
                1
              </span>


              <div>

                <strong>
                  ACROSS REGRESSION
                </strong>

                <small>
                  20-shooter session
                </small>

              </div>

            </div>


            <div className="strategy-card">

              <span className="strategy-number">
                2
              </span>


              <div>

                <strong>
                  1-HIT 6/8 REGRESS
                </strong>

                <small>
                  20-shooter session
                </small>

              </div>

            </div>


            <div className="strategy-card">

              <span className="strategy-number">
                3
              </span>


              <div>

                <strong>
                  HEDGE (DP + 6/8)
                </strong>

                <small>
                  20-shooter session
                </small>

              </div>

            </div>


            <div className="strategy-card">

              <span className="strategy-number">
                4
              </span>


              <div>

                <strong>
                  PURE DARK SIDE
                </strong>

                <small>
                  20-shooter session
                </small>

              </div>

            </div>


            <div className="strategy-card">

              <span className="strategy-number">
                5
              </span>


              <div>

                <strong>
                  IRON CROSS
                </strong>

                <small>
                  $10 Field + $10 5/6/8
                </small>

              </div>

            </div>

          </div>

        </section>


        {/* RESULTS */}

        <section className="results-section">

          <div className="results-header">

            <h2>
              Global Profit Analysis
            </h2>


            {results.length > 0 && (

              <span className="complete-badge">

                COMPLETE

              </span>

            )}

          </div>


          <div className="terminal">

            <pre>

              {terminalText()}

            </pre>

          </div>

        </section>


        {/* TABLE */}

        {results.length > 0 && (

          <section className="summary-section">

            <h2>
              Results Summary
            </h2>


            <div className="results-table-wrapper">

              <table className="results-table">

                <thead>

                  <tr>

                    <th>
                      Strategy
                    </th>

                    <th>
                      Avg Final
                    </th>

                    <th>
                      Avg Profit
                    </th>

                    <th>
                      Profit %
                    </th>

                    <th>
                      Bust %
                    </th>

                    <th>
                      Min Final
                    </th>

                    <th>
                      Max Final
                    </th>

                    <th>
                      Avg Rolls
                    </th>

                    <th>
                      Outcome
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {results.map(
                    result => (

                      <tr
                        key={
                          result.name
                        }
                      >

                        <td className="strategy-cell">

                          {
                            result.name
                          }

                        </td>


                        <td>

                          {formatCurrency(
                            result.averageFinal
                          )}

                        </td>


                        <td>

                          {formatCurrency(
                            result.averageProfit
                          )}

                        </td>


                        <td>

                          {
                            result.profitPercent.toFixed(
                              1
                            )
                          }%

                        </td>


                        <td>

                          {
                            result.bustPercent.toFixed(
                              1
                            )
                          }%

                        </td>


                        <td>

                          {formatCurrency(
                            result.minFinal
                          )}

                        </td>


                        <td>

                          {formatCurrency(
                            result.maxFinal
                          )}

                        </td>


                        <td>

                          {
                            result.averageRolls.toFixed(
                              1
                            )
                          }

                        </td>


                        <td>

                          <span
                            className={
                              result.outcome ===
                              "PROFIT"

                                ? "profit"

                                : "deficit"
                            }
                          >

                            {
                              result.outcome
                            }

                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}


        {/* FOOTER */}

        <footer>

          <p>
            Craps Ultimate Pro
          </p>

          <p>
            Session = 20 Shooters
          </p>

          <p>
            Strategies = 5
          </p>

          <p>
            Monte Carlo Simulation
          </p>

        </footer>

      </div>

    </div>
  );
}


export default App;
