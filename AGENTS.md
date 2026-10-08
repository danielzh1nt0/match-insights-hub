<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Individual pass maps use the existing Stats card, pitch and pass-data helpers; this preserves team identity, coordinate normalization and period filtering without duplicating the data contract.
- Defensive-height maps derive durations and shot rates from the selected line timeline and outcomes; small samples remain visible in raw-rate rankings to avoid misleading conclusions.
