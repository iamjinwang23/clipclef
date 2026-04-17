-- Design Ref: §3.2 — notify_on_reply 트리거 (대댓글 → 원 댓글 작성자 알림)
-- parent_id IS NOT NULL인 INSERT 시 'reply' 알림 생성. 자기 자신 제외.

CREATE OR REPLACE FUNCTION notify_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author
    FROM comments
    WHERE id = NEW.parent_id;

    IF v_parent_author IS NOT NULL AND v_parent_author IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
      VALUES (v_parent_author, NEW.user_id, 'reply', NEW.id, 'playlist');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_reply
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_reply();
