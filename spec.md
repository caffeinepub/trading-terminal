# Trading Terminal

## Current State
The VolumeTable component fetches market status from the Dzengi `/exchangeInfo` endpoint and uses the `status` field directly. However, the API returns `TRADING` for forex pairs even on weekends (e.g., Sunday), when forex markets are actually closed. The app therefore incorrectly shows forex as "Open" on days when it is closed.

## Requested Changes (Diff)

### Add
- A `computeStatusFromSchedule(tradingHours: string, apiStatus: string)` utility function that parses the `tradingHours` string from the API and computes the real market status based on the current UTC day and time.
- The parser needs to handle the schedule format: `UTC; Mon - 21:59:50, 22:05 -; Fri - 21:59:50; Sun 22:00 -` (each day segment lists open/close windows; `"Day HH:MM -"` = open from that time until end of day; `"Day - HH:MM"` = open from midnight until that time; no entry for a day = fully closed that day).

### Modify
- In `VolumeTable.tsx`, after fetching `exchangeInfo` and merging into rows, pass `tradingHours` through `computeStatusFromSchedule` to override the API `status` with the locally-computed status.
- Both the initial `exchangeInfo` merge and the recurring ticker poll merge should apply this computation.

### Remove
- Blind trust of the API `status` field for assets that have a `tradingHours` schedule.

## Implementation Plan
1. Add `computeStatusFromSchedule(tradingHours: string, apiStatus: string): "TRADING" | "BREAK" | "HALT"` above the `StatusCell` component in `VolumeTable.tsx`.
2. The function parses the schedule string, extracts time windows for today (UTC weekday), and checks if now-UTC falls inside any window. Returns `"BREAK"` if outside all windows, else the original `apiStatus`.
3. Apply the function in both places where `info.status` is assigned: the `exchangeInfo` effect and the `fetchTickers` callback.
