-- Tighten car_update: only the non-initiating party may accept a request.
-- Previously either party could accept, allowing a coach to auto-accept
-- their own outgoing invite. Either party may still decline or cancel.

drop policy if exists car_update on public.coach_athlete_relationships;

create policy car_update
  on public.coach_athlete_relationships for update
  using (coach_id = auth.uid() or athlete_id = auth.uid())
  with check (
    (status = 'accepted' and (
      (initiator_role = 'coach'   and athlete_id = auth.uid()) or
      (initiator_role = 'athlete' and coach_id   = auth.uid())
    )) or
    status in ('declined', 'pending')
  );
