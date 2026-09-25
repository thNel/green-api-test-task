import { configureStore } from '@reduxjs/toolkit'
import { greenApiApi } from '../api/greenApiApi'

export const store = configureStore({
  reducer: { [greenApiApi.reducerPath]: greenApiApi.reducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(greenApiApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
