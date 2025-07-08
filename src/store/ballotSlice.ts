// Import Redux Toolkit helpers:
//   - `createSlice` -> generates Redux logic automatically (actions + reducer).
//   - `PayloadAction` -> TypeScript type for describing the data your action carries.

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Candidate } from "@/types";

// interface describing how your Redux state stores the user’s votes, as an object where each key is a position (like “President”) and the value is either the chosen candidate or null.

// This makes it easy to track which candidate was selected for each role in the ballot.
// This also allows dynamic positions (para hindi maging static/fixed na president, vp lng ang positions) 
export interface BallotState {
  //   Record<K, V> is a TypeScript utility type that means:
  // “An object whose keys are type K and whose values are type V.”
  // e.g. { President: Candidate | null,}

  selections: Record<string, Candidate[] | null>;
}

// sets the initial state of ballot
const initialState: BallotState = {
  selections: {},
};

// - A slice: to group redux (states, actions, and reducers) for a specific fuction/feature 

const ballotSlice = createSlice({
// name is used as a prefix for your action types,
// e.g.:
// "ballot/selectCandidate"
// "ballot/clearSelections"
  name: "ballot", 
  // - This sets the starting value of your Redux state for this slice.
  // this is set on line 21 and 17
  initialState,

  // reducer is a function that takes:
  // the old state, an action, and returns a new state.
  // The individual functions inside are called "reducers"
  reducers: {
    selectCandidate(
      // state: the current state of this slice
      // action: an object that carries the data
      state,
      action: PayloadAction<{ position: string; candidate: Candidate }>
    ) {
      // initialize position if not yet selected
      const { position, candidate } = action.payload;
        if (!state.selections[position]) {
        state.selections[position] = [];
      }

      // prevent duplicate selection
      const alreadySelected = state.selections[position].some(
        (c) => c.name === candidate.name
      );
      if (!alreadySelected) {
        state.selections[position].push(candidate);
      }
    },
    // when deselecting a candidate
    deselectCandidate(
      state, 
      action: PayloadAction<{ position: string; candidateName: string }>
    ) {
      const { position, candidateName } = action.payload;
      if (state.selections[position]) {
        // Remove candidate by name
        state.selections[position] = state.selections[position].filter(
          (c) => c.name !== candidateName
        );
        // If no candidates remain, remove the position from state
        if (state.selections[position].length === 0) {
          delete state.selections[position];
        }
  }
    },

    // another reducer: clearSelections.
    // When this runs:
    // it empties the selections object / resets the ballot
    clearSelections(state) {
      state.selections = {};
    },
  },
});

export const { selectCandidate, deselectCandidate, clearSelections } = ballotSlice.actions;

export default ballotSlice.reducer;