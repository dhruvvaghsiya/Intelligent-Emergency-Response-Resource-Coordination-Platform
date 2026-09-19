// packages/core-logic/hungarian.ts equivalent — min-cost bipartite assignment, O(n^3).
// Square-matrix Hungarian (Kuhn-Munkres), used for §22.4 dispatch solving.
// Rows = required capability slots, Columns = candidate units. Cost matrix is padded to
// square with dummy rows/columns at `infeasiblePenalty` for unmet requirements.

/**
 * @param {number[][]} costMatrix - square matrix, costMatrix[row][col]
 * @returns {{assignment: number[], totalCost: number}} assignment[row] = col index (or -1)
 */
export function hungarian(costMatrix) {
  const n = costMatrix.length;
  if (n === 0) return { assignment: [], totalCost: 0 };

  // Jonker-Volgenant-ish / classic O(n^3) Hungarian via potentials (Kuhn-Munkres).
  const INF = Infinity;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0); // p[j] = row assigned to column j (1-indexed)
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) {
    if (p[j] !== 0) assignment[p[j] - 1] = j - 1;
  }

  let totalCost = 0;
  for (let i = 0; i < n; i++) {
    if (assignment[i] >= 0) totalCost += costMatrix[i][assignment[i]];
  }

  return { assignment, totalCost };
}

/** Reference brute-force solver for n<=7, used only by tests to validate `hungarian()`. */
export function bruteForceAssignment(costMatrix) {
  const n = costMatrix.length;
  const indices = [...Array(n).keys()];
  let best = null;
  let bestCost = Infinity;

  function permute(arr, k = 0) {
    if (k === arr.length) {
      let cost = 0;
      for (let i = 0; i < n; i++) cost += costMatrix[i][arr[i]];
      if (cost < bestCost) {
        bestCost = cost;
        best = [...arr];
      }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  }
  permute(indices);
  return { assignment: best, totalCost: bestCost };
}

/** Greedy nearest-cost baseline, used for the "Hungarian beat greedy by X" demo comparison. */
export function greedyAssignment(costMatrix) {
  const n = costMatrix.length;
  const usedCols = new Set();
  const assignment = new Array(n).fill(-1);
  let totalCost = 0;
  for (let i = 0; i < n; i++) {
    let bestJ = -1;
    let bestCost = Infinity;
    for (let j = 0; j < n; j++) {
      if (usedCols.has(j)) continue;
      if (costMatrix[i][j] < bestCost) {
        bestCost = costMatrix[i][j];
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      assignment[i] = bestJ;
      usedCols.add(bestJ);
      totalCost += bestCost;
    }
  }
  return { assignment, totalCost };
}
