#!/usr/bin/env python3
"""
MANDATORY EMAIL API - Claude Assistant
Use this for ALL email sending. NO MCP tools.
"""

import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from email.mime.text import MIMEText
import base64

# MANDATORY CONFIGURATION
USER_EMAIL = "thedavidmurray@gmail.com"  # David's main email
ASSISTANT_EMAIL = "djm.claude.assistant@gmail.com"  # From address
TOKEN_PATH = "/Users/djm/claude-projects/.mcp/gmail/token.json"

def send_email_to_david(subject, body):
    """
    MANDATORY: Use this function for ALL emails to David
    Returns: message_id on success, raises exception on failure
    """
    try:
        # Load OAuth token
        with open(TOKEN_PATH, 'r') as f:
            creds = Credentials.from_authorized_user_info(
                json.load(f), 
                ['https://www.googleapis.com/auth/gmail.modify']
            )
        
        # Build Gmail service
        service = build('gmail', 'v1', credentials=creds)
        
        # Create email message
        message = MIMEText(body)
        message['to'] = USER_EMAIL
        message['from'] = ASSISTANT_EMAIL
        message['subject'] = subject
        
        # Encode and send
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        result = service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()
        
        print(f"✅ Email sent to {USER_EMAIL}")
        print(f"📧 Subject: {subject}")
        print(f"🆔 Message ID: {result['id']}")
        
        return result['id']
        
    except Exception as e:
        print(f"❌ Email failed: {str(e)}")
        raise

def send_analysis_summary(title, analysis_content, obsidian_paths=None):
    """
    Template for sending analysis summaries
    """
    obsidian_section = ""
    if obsidian_paths:
        obsidian_section = f"\n\n## Documentation Created\n\nI've documented the analysis in the Obsidian vault:\n"
        for path in obsidian_paths:
            obsidian_section += f"- {path}\n"
    
    body = f"""Hi David,

I've completed the analysis of: {title}

{analysis_content}{obsidian_section}

Let me know if you need deeper analysis on any specific aspect.

Best,  
Claude

---
*Generated from automated analysis workflow*"""

    return send_email_to_david(
        subject=f"Analysis Complete: {title}",
        body=body
    )

def send_task_completion(task_name, results, files_created=None):
    """
    Template for task completion notifications
    """
    files_section = ""
    if files_created:
        files_section = f"\n\n## Files Created/Modified\n\n"
        for file in files_created:
            files_section += f"- {file}\n"
    
    body = f"""Hi David,

Task completed: {task_name}

## Results
{results}{files_section}

Best,  
Claude

---
*Generated from task completion workflow*"""

    return send_email_to_david(
        subject=f"Task Complete: {task_name}",
        body=body
    )

# Command line usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python claude-email-api.py 'Subject' 'Body content'")
        sys.exit(1)
    
    subject = sys.argv[1]
    body = sys.argv[2]
    
    try:
        message_id = send_email_to_david(subject, body)
        print(f"Success: {message_id}")
    except Exception as e:
        print(f"Failed: {e}")
        sys.exit(1)