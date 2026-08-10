-- Allow staff to view all notifications
CREATE POLICY "Staff can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- Allow staff to update any notification (mark as read)
CREATE POLICY "Staff can update notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));