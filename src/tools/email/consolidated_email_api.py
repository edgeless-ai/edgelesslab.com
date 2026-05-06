#!/Library/Frameworks/Python.framework/Versions/3.11/bin/python3
"""
Consolidated Email API - Claude Assistant
Uses the unified email service for all email operations
Maintains compatibility with existing scripts
"""

import os
import sys
from pathlib import Path
from typing import Optional, List, Dict

# Add the path to find the unified service
sys.path.insert(0, str(Path(__file__).parent))

from unified_email_service import UnifiedEmailService, EmailConfig

# Import inbound email fetcher (EDGA-26)
try:
    from inbound_email_fetcher import (
        InboundEmailFetcher,
        FetchedEmail,
        fetch_recent_emails,
        fetch_all_unread,
        mark_processed,
    )
    INBOUND_AVAILABLE = True
except ImportError:
    INBOUND_AVAILABLE = False

# Create global service instance
_service = None
_fetcher = None


def get_service():
    """Get or create the global email service"""
    global _service
    if _service is None:
        _service = UnifiedEmailService()
    return _service


def get_fetcher():
    """Get or create the global inbound email fetcher"""
    global _fetcher
    if _fetcher is None and INBOUND_AVAILABLE:
        _fetcher = InboundEmailFetcher()
    return _fetcher


# ==================== OUTBOUND EMAIL (Sending) ====================
def send_email_to_david(
    subject: str, body: str, use_html: bool = True
) -> Optional[str]:
    """
    MANDATORY: Use this function for ALL emails to David
    Returns: message_id on success, raises exception on failure

    NEW: All emails are now automatically archived to Obsidian vault at:
    - Regular emails: /claude-vault/13-Reports/Emails/Sent/
    - RSS analyses: /claude-vault/00-Inbox/rss/

    Emails are tagged and categorized automatically based on content.
    HTML formatting is now enabled by default for better readability.
    """
    # Validate inputs to prevent empty emails
    if not subject or not isinstance(subject, str):
        raise ValueError("Email subject is required and must be a string")

    if not body or not isinstance(body, str) or len(body.strip()) < 10:
        # Log warning and create default body
        print(f"⚠️  Warning: Email body is empty or too short for subject: {subject}")
        body = f"""This email was generated automatically but the content was missing.

Subject: {subject}

This may have been triggered during RSS feed processing or another automated task.
The task may have completed successfully but failed to generate a proper summary.

Please check the system logs for more information."""

    # Send email (archiving happens automatically in UnifiedEmailService)
    return get_service().send_to_david(subject, body, use_html=use_html)


def send_analysis_summary(
    title: str,
    video_metadata: str,
    executive_summary: str,
    key_insights: str,
    actionable_takeaways: str,
    relevance_to_work: str,
    obsidian_paths: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Template for sending comprehensive video analysis with excellent formatting
    """
    return get_service().send_analysis_summary(
        title=title,
        video_metadata=video_metadata,
        executive_summary=executive_summary,
        key_insights=key_insights,
        actionable_takeaways=actionable_takeaways,
        relevance_to_work=relevance_to_work,
        obsidian_paths=obsidian_paths,
    )


def send_task_completion(
    task_name: str, results: str, files_created: Optional[List[str]] = None
) -> Optional[str]:
    """
    Template for task completion notifications
    """
    return get_service().send_task_completion(
        task_name=task_name, results=results, files_created=files_created
    )


def send_link_analysis(
    url: str, summary: str, insights: str, analysis: str, metadata: str = ""
) -> Optional[str]:
    """
    Send link analysis results
    """
    return get_service().send_link_analysis(
        url=url,
        summary=summary,
        insights=insights,
        analysis=analysis,
        metadata=metadata,
    )


def send_analysis(
    title: str,
    topic: str,
    content: str,
    greeting: str = "I've completed the analysis you requested.",
    closing: str = "Let me know if you need any clarification or additional analysis.",
) -> Optional[str]:
    """
    Send an analysis email using template
    """
    return get_service().send_analysis(
        title=title, topic=topic, content=content, greeting=greeting, closing=closing
    )


# ==================== INBOUND EMAIL (Fetching) ====================
# EDGA-26: Enable inbound email ingestion

def fetch_inbound_emails(
    max_results: int = 10,
    since_hours: int = 24,
    unread_only: bool = True,
    query: Optional[str] = None,
) -> List:
    """
    Fetch inbound emails from djm.claude.assistant@gmail.com
    
    Args:
        max_results: Maximum emails to fetch (1-500)
        since_hours: Only fetch emails newer than this many hours
        unread_only: Only fetch unread emails
        query: Custom Gmail search query (e.g., 'from:someone@example.com subject:test')
        
    Returns:
        List of FetchedEmail objects with full metadata
        
    Example:
        emails = fetch_inbound_emails(max_results=5)
        for email in emails:
            print(f"From: {email.sender}")
            print(f"Subject: {email.subject}")
            print(f"Body: {email.body_text[:200]}")
    """
    if not INBOUND_AVAILABLE:
        raise RuntimeError("Inbound email fetcher not available. Check dependencies.")
    
    return get_fetcher().fetch_emails(
        max_results=max_results,
        since_hours=since_hours,
        unread_only=unread_only,
        query=query,
    )


def fetch_unread_inbox(max_results: int = 50) -> List:
    """
    Fetch all unread emails from inbox
    
    Useful for processing task requests, forwarded content, etc.
    """
    if not INBOUND_AVAILABLE:
        raise RuntimeError("Inbound email fetcher not available")
    
    return get_fetcher().fetch_emails(
        max_results=max_results,
        unread_only=True,
        since_hours=None,  # All time
    )


def mark_email_processed(message_id: str, archive: bool = True) -> bool:
    """
    Mark an inbound email as processed (read + optionally archive)
    
    Args:
        message_id: The Gmail message ID
        archive: If True, also remove from inbox (archive)
        
    Returns:
        True if successful
    """
    if not INBOUND_AVAILABLE:
        raise RuntimeError("Inbound email fetcher not available")
    
    return get_fetcher().mark_as_read(message_id) and (
        not archive or get_fetcher().archive(message_id)
    )


def get_gmail_labels() -> List[Dict]:
    """Get all available Gmail labels"""
    if not INBOUND_AVAILABLE:
        raise RuntimeError("Inbound email fetcher not available")
    
    return get_fetcher().get_labels()


# Command line interface
def main():
    """CLI interface for email sending"""
    import argparse

    parser = argparse.ArgumentParser(description="Consolidated Email API")
    parser.add_argument(
        "command", nargs="?", default="send", choices=["send", "templates", "test"]
    )
    parser.add_argument("subject", nargs="?", help="Email subject")
    parser.add_argument("body", nargs="?", help="Email body")
    parser.add_argument("--template", help="Template name")
    parser.add_argument("--file", help="Read body from file")
    parser.add_argument(
        "--list-templates", action="store_true", help="List available templates"
    )

    args = parser.parse_args()

    service = get_service()

    if args.list_templates or args.command == "templates":
        print("Available Email Templates:")
        print("=" * 50)
        for template in service.list_templates():
            print(f"\n{template['name']}: {template['description']}")
            print(f"Variables: {', '.join(template['variables'])}")
        return

    if args.command == "test":
        result = service.send_to_david(
            "Test Email from Consolidated API",
            "This is a test email from the new consolidated email API.\n\nIf you receive this, the consolidation is working!",
        )
        if result:
            print(f"Test email sent: {result}")
        else:
            print("Test email failed")
        return

    # Default send command
    if args.file:
        if not Path(args.file).exists():
            print(f"Error: File '{args.file}' not found")
            sys.exit(1)
        body = Path(args.file).read_text(encoding='utf-8')
    else:
        body = args.body or ""

    subject = args.subject or "Email from Claude"

    try:
        result = service.send_to_david(subject, body)
        if result:
            print(f"✅ Email sent successfully: {result}")
        else:
            print("❌ Email failed to send")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Email failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
