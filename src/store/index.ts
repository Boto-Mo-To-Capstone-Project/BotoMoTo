// sometimes this is called store.js/ts

import { configureStore } from "@reduxjs/toolkit";
import ballotReducer from "./ballotSlice";

// - Calls `configureStore` to **create your Redux store**.
// - Stores everything in an object called `store`.
// - You’ll later provide this store to your React app via `<Provider>`.
export const store = configureStore({
  // The whole slice is often called a "reducer" (ballotReducer)
  reducer: {
    ballot: ballotReducer,
  },
});

// Types for TypeScript

// - Defines a TypeScript **type** named `RootState`.
// - `store.getState` is a function that returns the entire Redux state object.
// - `ReturnType<typeof store.getState>` automatically grabs its return type.
export type RootState = ReturnType<typeof store.getState>;

// - Defines the type for your Redux **dispatch** function.
// - `typeof store.dispatch` gives you the exact type signature.
// kapag gagamit ka ng state in a component
export type AppDispatch = typeof store.dispatch;