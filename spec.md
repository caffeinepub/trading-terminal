# Trading Terminal

## Current State
TopNav has 6 nav links including Account. The Trader chip (top-right) has a ChevronDown but no dropdown behavior.

## Requested Changes (Diff)

### Add
- Dropdown on Trader chip click showing account info and actions

### Modify
- Remove Account from NAV_LINKS
- Trader chip opens/closes dropdown with chevron rotation

### Remove
- Account nav tab

## Implementation Plan
1. Remove Account from NAV_LINKS
2. Add Popover to Trader chip with account panel content
