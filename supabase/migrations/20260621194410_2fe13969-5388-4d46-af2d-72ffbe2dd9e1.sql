
ALTER VIEW public.margin_by_client SET (security_invoker = true);

-- Restringe l'esecuzione delle funzioni helper agli utenti autenticati
REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role_in_company(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_company_published(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_company(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_published(uuid) TO authenticated;
