DROP POLICY IF EXISTS "Users can manage their own dose logs" ON public.dose_logs;

CREATE POLICY "Users can manage their own dose logs"
    ON public.dose_logs
    FOR ALL
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.medicine_schedules
            WHERE id = dose_logs.schedule_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.medicine_schedules
            WHERE id = dose_logs.schedule_id AND user_id = auth.uid()
        )
    );
