#!/Library/Frameworks/Python.framework/Versions/3.11/bin/python3
"""
Consolidated Email API - Claude Assistant
Uses the unified email service for all email operations
Maintains compatibility with existing scripts
"""

import os
import sys
from pathlib import Path
from typing import Optional, List

# Add the path to find the unified service
sys.path.insert(0, str(Path(__file__).parent))

from unified_email_service import UnifiedEmailService, EmailConfig

# Create global service instance
_service = None


def get_service():
    """Get or create the global email service"""
    global _service
    if _service is None:
        _service = UnifiedEmailService()
    return _service


# Main API functions for backward compatibility
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
