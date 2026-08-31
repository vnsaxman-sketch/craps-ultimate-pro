import { useState } from "react";

/*
 * ============================================================
 * CRAPS ULTIMATE PRO
 * TypeScript + Vite + React
 *
 * SESSION DEFINITION:
 *     1 session = 20 shooters
 *
 * A shooter continues until:
 *     - Point is made
 *     - 7-out
 *
 * Each shooter therefore contains a variable number of rolls.
 * ============================================================
 */


/* ============================================================
   TYPES
============================================================ */

type DiceTotal = number;

type StrategyName =
  | "ACROSS REGRESSION"
  | "1-HIT 6/8 REGRESS"
  | "HEDGE (DP + 6/8)"
  | "PURE DARK SIDE";

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

  outcome: "PROFIT" | "DEFICIT";
}


/* ============================================================
   CONSTANTS
============================================================ */

const SHOOTERS_PER_SESSION = 20;


/* ============================================================
   DICE
============================================================ */

function rollDice(): {
  die1: number;
  die2: number;
  total: number;
} {
  const die1 =
    Math.floor(Math.random() * 6) + 1;

  const die2 =
    Math.floor(Math.random() * 6) + 1;

  return {
    die1,
    die2,
    total: die1 + die2,
  };
}


/* ============================================================
   PASS LINE SHOOTER ENGINE
============================================================ */

/*
 * Simulates ONE complete Craps shooter.
 *
 * Come-out:
 *
 * 7 or 11 -> natural
 * 2,3,12 -> craps
 * 4,5,6,8,9,10 -> point established
 *
 * Once point established:
 *
 * Point -> point made -> shooter ends
 * 7 -> seven-out -> shooter ends
 * Anything else -> continue rolling
 */

function simulateShooter(
  shooterNumber: number,
  startingRollNumber: number
): ShooterResult {

  const rolls: RollResult[] = [];

  let point: number | null = null;

  let rollNumber = startingRollNumber;

  while (true) {

    const dice = rollDice();

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

      if (
        dice.total === 7 ||
        dice.total === 11
      ) {
        /*
         * Natural.
         *
         * Shooter's hand ends.
         */
        break;
      }

      if (
        dice.total === 2 ||
        dice.total === 3 ||
        dice.total === 12
      ) {
        /*
         * Craps.
         *
         * Shooter continues with another
         * come-out roll.
         */
        continue;
      }

      /*
       * Establish point.
       */
      if (
        [4, 5, 6, 8, 9, 10].includes(
          dice.total
        )
      ) {
        point = dice.total;
      }

      continue;
    }

    /*
     * --------------------------------------------------------
     * POINT PHASE
     * --------------------------------------------------------
     */

    if (dice.total === point) {

      /*
       * Point made.
       */
      break;
    }

    if (dice.total === 7) {

      /*
       * Seven-out.
       */
      break;
    }

    /*
     * Otherwise shooter continues.
     */
  }

  const lastRoll =
    rolls[rolls.length - 1];

  return {
    shooterNumber,
    rolls,
    totalRolls: rolls.length,
    point,
    sevenOut:
      lastRoll.total === 7 &&
      point !== null,
  };
}


/* ============================================================
   ACROSS REGRESSION
============================================================ */

/*
 * The strategy now operates against actual Craps rolls.
 *
 * This preserves the basic betting behavior of the
 * original Python program while using real shooter
 * boundaries.
 */

function simulateAcrossRegression(
  bankroll: number
): SessionResult {

  let balance = bankroll;

  let globalRollNumber = 0;

  const shooters: ShooterResult[] = [];

  for (
    let shooterNumber = 1;
    shooterNumber <= SHOOTERS_PER_SESSION;
    shooterNumber++
  ) {

    if (balance <= 0) {
      break;
    }

    /*
     * Strategy state
     */
    let bet = 160;

    let hits = 0;

    const shooter =
      simulateShooter(
        shooterNumber,
        globalRollNumber
      );

    globalRollNumber +=
      shooter.totalRolls;

    /*
     * Evaluate each roll for the strategy.
     */
    for (const roll of shooter.rolls) {

      if (balance < bet) {
        break;
      }

      /*
       * 7 loses the current bet.
       */
      if (roll.total === 7) {

        balance -= bet;

        break;
      }

      /*
       * Place numbers.
       */
      if (
        [4, 5, 6, 8, 9, 10].includes(
          roll.total
        )
      ) {

        balance += 30;

        hits++;

        if (hits === 2) {
          bet = 44;
        }

        if (hits >= 6) {
          break;
        }
      }
    }

    shooters.push(shooter);
  }

  return {
    sessionNumber: 1,
    startingBankroll: bankroll,
    endingBankroll: balance,
    profit: balance - bankroll,
    totalRolls: globalRollNumber,
    totalShooters: shooters.length,
    shooters,
  };
}


/* ============================================================
   1-HIT 6/8 REGRESSION
============================================================ */

function simulateOneHitRegression(
  bankroll: number
): SessionResult {

  let balance = bankroll;

  let globalRollNumber = 0;

  const shooters: ShooterResult[] = [];

  for (
    let shooterNumber = 1;
    shooterNumber <= SHOOTERS_PER_SESSION;
    shooterNumber++
  ) {

    if (balance < 120) {
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
     * Look for the first 6 or 8
     * during this shooter.
     */

    for (const roll of shooter.rolls) {

      if (balance < 120) {
        break;
      }

      if (roll.total === 7) {

        balance -= 120;

        break;
      }

      if (
        roll.total === 6 ||
        roll.total === 8
      ) {

        balance += 58;

        break;
      }
    }

    shooters.push(shooter);
  }

  return {
    sessionNumber: 1,
    startingBankroll: bankroll,
    endingBankroll: balance,
    profit: balance - bankroll,
    totalRolls: globalRollNumber,
    totalShooters: shooters.length,
    shooters,
  };
}


/* ============================================================
   HEDGE DP + 6/8
============================================================ */

function simulateHedgeCombo(
  bankroll: number
): SessionResult {

  let balance = bankroll;

  let globalRollNumber = 0;

  const shooters: ShooterResult[] = [];

  for (
    let shooterNumber = 1;
    shooterNumber <= SHOOTERS_PER_SESSION;
    shooterNumber++
  ) {

    if (balance < 34) {
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
     * We process the shooter's rolls.
     */
    for (const roll of shooter.rolls) {

      if (balance < 34) {
        break;
      }

      const d = roll.total;

      /*
       * Don't Pass immediate results.
       */
      if (
        d === 7 ||
        d === 11
      ) {

        balance -= 10;

        continue;
      }

      if (
        d === 2 ||
        d === 3
      ) {

        balance += 10;

        continue;
      }

      /*
       * Point established.
       */
      if (
        [4, 5, 6, 8, 9, 10].includes(d)
      ) {

        const dpBet = 10;

        let b6 = 12;

        let b8 = 12;

        /*
         * Process subsequent rolls.
         */
        const startIndex =
          shooter.rolls.indexOf(roll) + 1;

        for (
          let i = startIndex;
          i < shooter.rolls.length;
          i++
        ) {

          const r =
            shooter.rolls[i].total;

          if (r === 7) {

            balance +=
              dpBet - (b6 + b8);

            break;
          }

          if (
            r === 6 ||
            r === 8
          ) {

            balance += 14;

            b6 = 0;

            b8 = 0;
          }

          if (r === d) {

            balance -= dpBet;

            break;
          }
        }

        break;
      }
    }

    shooters.push(shooter);
  }

  return {
    sessionNumber: 1,
    startingBankroll: bankroll,
    endingBankroll: balance,
    profit: balance - bankroll,
    totalRolls: globalRollNumber,
    totalShooters: shooters.length,
    shooters,
  };
}


/* ============================================================
   PURE DARK SIDE
============================================================ */

function simulateDarkSide(
  bankroll: number
): SessionResult {

  let balance = bankroll;

  let globalRollNumber = 0;

  const shooters: ShooterResult[] = [];

  for (
    let shooterNumber = 1;
    shooterNumber <= SHOOTERS_PER_SESSION;
    shooterNumber++
  ) {

    if (balance < 10) {
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
     * Process each roll.
     */

    for (const roll of shooter.rolls) {

      if (balance < 10) {
        break;
      }

      const d = roll.total;

      if (
        d === 7 ||
        d === 11
      ) {

        balance -= 10;

        continue;
      }

      if (
        d === 2 ||
        d === 3
      ) {

        balance += 10;

        continue;
      }

      if (
        [4, 5, 6, 8, 9, 10].includes(d)
      ) {

        /*
         * Dark side wager stays until:
         *
         * 7 -> win
         * Same number -> lose
         */

        for (
          const subsequentRoll
          of shooter.rolls
        ) {

          if (
            subsequentRoll.rollNumber <=
            roll.rollNumber
          ) {
            continue;
          }

          if (
            subsequentRoll.total === 7
          ) {

            balance += 10;

            break;
          }

          if (
            subsequentRoll.total === d
          ) {

            balance -= 10;

            break;
          }
        }
      }
    }

    shooters.push(shooter);
  }

  return {
    sessionNumber: 1,
    startingBankroll: bankroll,
    endingBankroll: balance,
    profit: balance - bankroll,
    totalRolls: globalRollNumber,
    totalShooters: shooters.length,
    shooters,
  };
}


/* ============================================================
   STRATEGY MAP
============================================================ */

const strategyFunctions: Record<
  StrategyName,
  (bankroll: number) => SessionResult
> = {

  "ACROSS REGRESSION":
    simulateAcrossRegression,

  "1-HIT 6/8 REGRESS":
    simulateOneHitRegression,

  "HEDGE (DP + 6/8)":
    simulateHedgeCombo,

  "PURE DARK SIDE":
    simulateDarkSide,
};


/* ============================================================
   APP
============================================================ */

function App() {

  const [startBankroll, setStartBankroll] =
    useState<number>(1000);

  const [sessions, setSessions] =
    useState<number>(2);

  const [results, setResults] =
    useState<StrategyResult[]>([]);

  const [isRunning, setIsRunning] =
    useState<boolean>(false);


  /* ==========================================================
     FORMAT CURRENCY
  ========================================================== */

  const formatCurrency =
    (value: number): string => {

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

  const runSimulations = () => {

    if (
      !Number.isFinite(startBankroll) ||
      startBankroll <= 0
    ) {

      alert(
        "Starting bankroll must be greater than $0."
      );

      return;
    }

    if (
      !Number.isFinite(sessions) ||
      sessions < 1
    ) {

      alert(
        "Simulated sessions must be at least 1."
      );

      return;
    }

    setIsRunning(true);

    /*
     * Allow React to update the screen before
     * starting the Monte Carlo simulation.
     */
    setTimeout(() => {

      const strategyResults: StrategyResult[] =
        [];

      const strategyNames: StrategyName[] = [
        "ACROSS REGRESSION",
        "1-HIT 6/8 REGRESS",
        "HEDGE (DP + 6/8)",
        "PURE DARK SIDE",
      ];


      for (
        const strategyName
        of strategyNames
      ) {

        const simulationFunction =
          strategyFunctions[
            strategyName
          ];

        const finalBankrolls: number[] = [];

        const profits: number[] = [];

        let totalRolls = 0;

        let totalShooters = 0;


        /*
         * Monte Carlo sessions
         */
        for (
          let session = 0;
          session < sessions;
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
            (sum, value) =>
              sum + value,
            0
          ) / sessions;


        /*
         * Bust percentage
         */
        const bustCount =
          finalBankrolls.filter(
            value => value <= 0
          ).length;

        const bustPercent =
          (bustCount / sessions) *
          100;


        /*
         * Maximum final bankroll
         */
        const maxFinal =
          Math.max(
            ...finalBankrolls
          );


        /*
         * Minimum final bankroll
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
            (sum, value) =>
              sum + value,
            0
          ) / sessions;


        /*
         * Percentage of profitable sessions
         */
        const profitableSessions =
          profits.filter(
            value => value > 0
          ).length;

        const profitPercent =
          (profitableSessions /
            sessions) *
          100;


        const outcome =
          averageFinal >
          startBankroll
            ? "PROFIT"
            : "DEFICIT";


        strategyResults.push({
          name: strategyName,

          averageFinal,

          bustPercent,

          maxFinal,

          minFinal,

          averageProfit,

          profitPercent,

          outcome,
        });


        /*
         * Prevent unused calculation warning.
         */
        void totalRolls;
        void totalShooters;
      }


      setResults(
        strategyResults
      );

      setIsRunning(false);

    }, 50);
  };


  /* ==========================================================
     CLEAR
  ========================================================== */

  const clearResults = () => {

    setResults([]);
  };


  /* ==========================================================
     TERMINAL OUTPUT
  ========================================================== */

  const terminalText = (): string => {

    if (results.length === 0) {

      return [
        "CRAPS ULTIMATE PRO",
        "",
        "READY TO RUN SIMULATION",
        "",
        `SESSION = ${SHOOTERS_PER_SESSION} SHOOTERS`,
        "",
        "Enter bankroll and number of",
        "Monte Carlo sessions.",
      ].join("\n");
    }


    const lines: string[] = [];

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
      "-".repeat(110)
    );


    for (
      const result
      of results
    ) {

      const strategy =
        result.name.padEnd(27);

      const average =
        formatCurrency(
          result.averageFinal
        ).padEnd(14);

      const bust =
        `${result.bustPercent.toFixed(
          1
        )}%`.padEnd(9);

      const maximum =
        formatCurrency(
          result.maxFinal
        ).padEnd(14);

      lines.push(
        `${strategy} | ${average} | ${bust} | ${maximum} | ${result.outcome}`
      );
    }


    lines.push("");

    lines.push(
      "ADDITIONAL STATISTICS"
    );

    lines.push(
      "-".repeat(110)
    );


    for (
      const result
      of results
    ) {

      lines.push(
        `${result.name}:`
      );

      lines.push(
        `  Average Profit : ${formatCurrency(
          result.averageProfit
        )}`
      );

      lines.push(
        `  Profit Sessions: ${result.profitPercent.toFixed(
          1
        )}%`
      );

      lines.push(
        `  Min Final      : ${formatCurrency(
          result.minFinal
        )}`
      );

      lines.push(
        `  Max Final      : ${formatCurrency(
          result.maxFinal
        )}`
      );

      lines.push("");
    }


    lines.push(
      "SIMULATION COMPLETE."
    );

    return lines.join("\n");
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
              value={startBankroll}
              onChange={(event) =>
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
              value={sessions}
              onChange={(event) =>
                setSessions(
                  Number(
                    event.target.value
                  )
                )
              }
            />

          </div>


          {/* SESSION DEFINITION */}

          <div className="session-info">

            <strong>
              Session Definition
            </strong>

            <p>
              Each simulated session
              contains exactly{" "}

              <strong>
                {SHOOTERS_PER_SESSION} shooters
              </strong>
              .
            </p>

            <p>
              Each shooter continues until
              the point is made or the
              shooter seven-outs.
            </p>

            <p>
              Therefore the number of rolls
              is variable from session to
              session.
            </p>

          </div>


          {/* BUTTONS */}

          <div className="button-row">

            <button
              className="run-button"
              onClick={
                runSimulations
              }
              disabled={isRunning}
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
              disabled={isRunning}
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
                  Real Craps shooters
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
                  Real Craps shooters
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
                  Real Craps shooters
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
                  Real Craps shooters
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


        {/* RESULTS TABLE */}

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
                          {result.name}
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
                          {result.profitPercent.toFixed(
                            1
                          )}%
                        </td>

                        <td>
                          {result.bustPercent.toFixed(
                            1
                          )}%
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
            Monte Carlo Simulation
          </p>

        </footer>

      </div>

    </div>
  );
}


export default App;
