---
id: task-100
title: Enable inbound email ingestion from djm.claude.assistant@gmail.com
epic: 2-ingestion
status: pending
priority: P2
depends_on: []
blocks: []
created: 2026-01-28
owner: david
estimated_effort: 3-4 hours
---

# Task 100: Inbound Email Ingestion for Claude Code

## Goal
Enable Claude Code to read and process inbound emails sent to djm.claude.assistant@gmail.com. Currently only outbound email sending is configured - need bidirectional email capabilities.

## Context
**Current state:**
- ✅ Can send emails via consolidated Gmail API to thedavidmurray@gmail.com
- ❌ Cannot read/process inbound emails to djm.claude.assistant@gmail.com

**Use cases for inbound email:**
- Process forwarded content (articles, newsletters, links)
- Accept task requests via email
- Ingest email-based knowledge (receipts, confirmations, notifications)
- Enable email → vault automation
- Respond to email queries
- Process email attachments

## Why This Matters
- **Unified inbox**: Forward anything to Claude via email
- **Knowledge capture**: Emails contain valuable info (receipts, confirmations, updates)
- **Automation**: Email-triggered workflows
- **Accessibility**: Can interact with Claude via email from anywhere
- **Integration**: Many services only send emails (no API)

## Step-by-Step Instructions

### Step 1: Research Gmail API for Reading Emails
```bash
# Review Gmail API docs for message retrieval
# Key endpoints:
# - gmail.users.messages.list (get message IDs)
# - gmail.users.messages.get (get full message)
# - gmail.users.labels.list (manage labels)
# - gmail.users.messages.modify (mark as read, archive, etc)
```

### Step 2: Check Existing Gmail API Setup
```bash
# Review consolidated email API
cat /Users/djm/claude-projects/src/tools/email/consolidated_email_api.py

# Check credentials
ls ~/.config/gcloud/  # or wherever OAuth credentials are stored

# Verify current scopes
# Sending requires: https://www.googleapis.com/auth/gmail.send
# Reading requires: https://www.googleapis.com/auth/gmail.readonly or gmail.modify
```

### Step 3: Update OAuth Scopes
If current credentials only have `gmail.send`:
```python
# Need to re-authenticate with broader scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',  # Read messages
    'https://www.googleapis.com/auth/gmail.modify',    # Modify (mark read, label)
]

# Will need to delete token.json and re-authenticate
# rm ~/.config/gcloud/token.json  # (or wherever stored)
# Run auth flow again
```

### Step 4: Build Email Fetcher Module
Create: `/Users/djm/claude-projects/src/tools/email/inbound_email_fetcher.py`

```python
"""Fetch and process inbound emails from djm.claude.assistant@gmail.com"""

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class InboundEmailFetcher:
    """Fetch emails from Gmail"""

    def __init__(self, credentials_path: str):
        self.creds = Credentials.from_authorized_user_file(credentials_path)
        self.service = build('gmail', 'v1', credentials=self.creds)

    def fetch_recent_emails(
        self,
        max_results: int = 10,
        since_hours: int = 24,
        unread_only: bool = True
    ) -> List[Dict]:
        """Fetch recent emails"""

        # Build query
        query_parts = []
        if unread_only:
            query_parts.append('is:unread')

        # Date filter
        since = datetime.now() - timedelta(hours=since_hours)
        query_parts.append(f'after:{since.strftime("%Y/%m/%d")}')

        query = ' '.join(query_parts)

        # List messages
        results = self.service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()

        messages = results.get('messages', [])

        # Fetch full message details
        emails = []
        for msg in messages:
            email = self.get_email_details(msg['id'])
            emails.append(email)

        return emails

    def get_email_details(self, message_id: str) -> Dict:
        """Get full email details"""
        msg = self.service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()

        # Parse headers
        headers = {h['name']: h['value'] for h in msg['payload']['headers']}

        # Extract body
        body = self._extract_body(msg['payload'])

        # Extract attachments info
        attachments = self._extract_attachments(msg['payload'])

        return {
            'id': message_id,
            'thread_id': msg['threadId'],
            'subject': headers.get('Subject', ''),
            'from': headers.get('From', ''),
            'to': headers.get('To', ''),
            'date': headers.get('Date', ''),
            'body': body,
            'attachments': attachments,
            'labels': msg.get('labelIds', []),
        }

    def _extract_body(self, payload: Dict) -> str:
        """Extract email body (text or HTML)"""
        if 'parts' in payload:
            # Multipart email
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    return base64.urlsafe_b64decode(data).decode('utf-8')
                elif part['mimeType'] == 'text/html':
                    data = part['body'].get('data', '')
                    return base64.urlsafe_b64decode(data).decode('utf-8')
        else:
            # Simple email
            data = payload['body'].get('data', '')
            return base64.urlsafe_b64decode(data).decode('utf-8')

        return ''

    def _extract_attachments(self, payload: Dict) -> List[Dict]:
        """Extract attachment metadata"""
        attachments = []
        if 'parts' in payload:
            for part in payload['parts']:
                if part['filename']:
                    attachments.append({
                        'filename': part['filename'],
                        'mime_type': part['mimeType'],
                        'size': part['body'].get('size', 0),
                        'attachment_id': part['body'].get('attachmentId'),
                    })
        return attachments

    def mark_as_read(self, message_id: str):
        """Mark email as read"""
        self.service.users().messages().modify(
            userId='me',
            id=message_id,
            body={'removeLabelIds': ['UNREAD']}
        ).execute()

    def download_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """Download email attachment"""
        attachment = self.service.users().messages().attachments().get(
            userId='me',
            messageId=message_id,
            id=attachment_id
        ).execute()

        data = attachment['data']
        return base64.urlsafe_b64decode(data)
```

### Step 5: Build Email Processing Pipeline
Create: `/Users/djm/claude-projects/src/tools/email/email_processor.py`

```python
"""Process inbound emails and route to appropriate handlers"""

from inbound_email_fetcher import InboundEmailFetcher
from typing import Dict, List

class EmailProcessor:
    """Route and process inbound emails"""

    def __init__(self, fetcher: InboundEmailFetcher):
        self.fetcher = fetcher

    def process_new_emails(self):
        """Fetch and process unread emails"""
        emails = self.fetcher.fetch_recent_emails(unread_only=True)

        for email in emails:
            self.route_email(email)
            self.fetcher.mark_as_read(email['id'])

    def route_email(self, email: Dict):
        """Route email to appropriate handler based on content"""
        subject = email['subject'].lower()
        body = email['body'].lower()

        # Routing logic
        if 'task:' in subject or 'todo:' in subject:
            self._handle_task_email(email)

        elif 'article' in subject or 'read this' in subject:
            self._handle_article_email(email)

        elif email['attachments']:
            self._handle_attachment_email(email)

        else:
            self._handle_generic_email(email)

    def _handle_task_email(self, email: Dict):
        """Create backlog task from email"""
        # Extract task details from subject/body
        # Create task file in /backlog/tasks/
        pass

    def _handle_article_email(self, email: Dict):
        """Save article to vault for processing"""
        # Extract links from body
        # Save to vault ingestion queue
        pass

    def _handle_attachment_email(self, email: Dict):
        """Process email attachments"""
        # Download and save attachments
        # Trigger appropriate processing (OCR, etc.)
        pass

    def _handle_generic_email(self, email: Dict):
        """Log generic email for manual review"""
        # Save to vault inbox
        pass
```

### Step 6: Create Cron Job for Periodic Checking
```bash
# Add to crontab
crontab -e

# Check for new emails every 15 minutes
*/15 * * * * cd /Users/djm/claude-projects && python src/tools/email/email_processor.py >> logs/email-ingestion.log 2>&1
```

### Step 7: Test Email Ingestion
```bash
# Send test email to djm.claude.assistant@gmail.com
# Subject: "Task: Test email ingestion"
# Body: "This is a test task from email"

# Run processor manually
python src/tools/email/email_processor.py

# Verify email was fetched and processed
cat logs/email-ingestion.log
```

### Step 8: Add to Vault Integration
Create email → vault workflow:
- Emails saved to `claude-vault/00-Inbox/Emails/YYYY-MM-DD-subject.md`
- Frontmatter includes sender, date, subject
- Body converted to markdown
- Attachments saved to vault assets

### Step 9: Create Email Response Capability
Combine inbound + outbound:
```python
def reply_to_email(original_email: Dict, reply_body: str):
    """Reply to an email"""
    send_email_to_david(
        subject=f"Re: {original_email['subject']}",
        body=reply_body,
        use_html=True
    )
```

---

## Acceptance Criteria
- [ ] Gmail API configured with read scopes
- [ ] Can fetch unread emails from djm.claude.assistant@gmail.com
- [ ] Emails parsed correctly (subject, body, attachments)
- [ ] Email routing logic implemented
- [ ] Cron job running for periodic checks
- [ ] Test emails successfully processed
- [ ] Vault integration working
- [ ] Documentation created

---

## Verification Checklist
- [ ] Send test email → appears in logs
- [ ] Email marked as read after processing
- [ ] Task email creates backlog item
- [ ] Article email saved to vault
- [ ] Attachment downloaded successfully
- [ ] Cron job runs without errors

---

## Security Considerations
- Store OAuth credentials securely
- Validate email senders (prevent spam abuse)
- Sanitize email content before processing
- Rate limit email processing
- Log all email operations for audit

## Integration Points
- **Vault**: Save emails to inbox
- **Backlog**: Create tasks from emails
- **Ingestion**: Queue links/content for processing
- **Memory**: Index email content in ChromaDB

## Future Enhancements
- Email-triggered skills (send email to activate skill)
- Natural language task creation via email
- Email → chat bridge (email conversations with Claude)
- Attachment OCR and processing
- Email analytics dashboard

## Artifacts
- Inbound fetcher: `src/tools/email/inbound_email_fetcher.py`
- Email processor: `src/tools/email/email_processor.py`
- Cron job: (added to crontab)
- Documentation: `docs/email-ingestion.md`

## Priority Justification
**P2** because:
- Useful but not urgent
- Existing workflows don't depend on it
- Adds new capability (nice to have)
- Moderate complexity to implement
