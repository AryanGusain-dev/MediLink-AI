-- Run after creating a Supabase Storage bucket named 'documents'

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_qr_profile ON qr_codes(profile_id);
CREATE INDEX idx_share_profile ON share_profiles(profile_id);

-- Optional helper view
CREATE VIEW dashboard_stats AS
SELECT
    p.id AS profile_id,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT q.id) AS total_qr_codes,
    COUNT(DISTINCT sp.id) AS total_share_profiles
FROM profiles p
LEFT JOIN documents d ON d.profile_id = p.id
LEFT JOIN qr_codes q ON q.profile_id = p.id
LEFT JOIN share_profiles sp ON sp.profile_id = p.id
GROUP BY p.id;
