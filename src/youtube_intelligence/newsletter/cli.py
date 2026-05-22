#!/usr/bin/env python3
"""
Newsletter CLI - Generate and send YouTube Intelligence newsletters.

Usage:
    python -m src.youtube_intelligence.newsletter.cli evening     # Generate evening edition
    python -m src.youtube_intelligence.newsletter.cli morning     # Generate morning edition
    python -m src.youtube_intelligence.newsletter.cli evening --send  # Generate and send
    python -m src.youtube_intelligence.newsletter.cli evening --preview  # Preview only
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_DIR))

# Load environment variables from .env file
env_path = PROJECT_DIR / "scripts" / "youtube_intelligence" / ".env"
if env_path.exists():
    load_dotenv(env_path)

from src.youtube_intelligence.newsletter.generator import NewsletterGenerator


def send_newsletter(edition, dry_run: bool = False):
    """Send newsletter via Gmail API."""
    if dry_run:
        print("\n[DRY RUN] Would send email:")
        print(f"  Subject: {edition.subject}")
        print(f"  Content length: {len(edition.html_body)} chars")
        return None

    import time
    try:
        sys.path.append(str(PROJECT_DIR / 'src' / 'tools' / 'email'))
        from consolidated_email_api import send_email_to_david

        for attempt in range(3):
            try:
                message_id = send_email_to_david(
                    subject=edition.subject,
                    body=edition.html_body,
                    use_html=True
                )
                return message_id
            except Exception as e:
                if "429" in str(e) or "rate" in str(e).lower():
                    wait = 60 * (attempt + 1)
                    print(f"Rate limited (attempt {attempt + 1}/3), waiting {wait}s...")
                    time.sleep(wait)
                else:
                    raise
        print("Rate limit persisted after 3 retries")
        return None
    except Exception as e:
        print(f"Error sending email: {e}")
        return None


def archive_to_vault(edition, edition_type: str):
    """Archive newsletter to Obsidian vault."""
    vault_dir = PROJECT_DIR / "claude-vault" / "13-Reports" / "YouTube-Newsletter"
    vault_dir.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"{date_str}-{edition_type}.md"

    content = f"""---
created: {datetime.now().isoformat()}
type: newsletter
edition: {edition_type}
video_count: {edition.content.video_count}
---

# {edition.subject}

{edition.plain_body}
"""

    filepath = vault_dir / filename
    filepath.write_text(content)
    print(f"Archived to: {filepath}")


def main():
    parser = argparse.ArgumentParser(description='YouTube Intelligence Newsletter')
    parser.add_argument(
        'edition',
        choices=['evening', 'morning'],
        help='Which edition to generate'
    )
    parser.add_argument(
        '--send',
        action='store_true',
        help='Send the newsletter via email'
    )
    parser.add_argument(
        '--preview',
        action='store_true',
        help='Show preview without sending'
    )
    parser.add_argument(
        '--lookback',
        type=int,
        default=24,
        help='Hours to look back for content (default: 24)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Generate but don\'t send (show what would happen)'
    )

    args = parser.parse_args()

    print("=" * 60)
    print(f"YouTube Intelligence Newsletter - {args.edition.title()} Edition")
    print("=" * 60)

    generator = NewsletterGenerator()

    # Generate the edition
    if args.edition == 'evening':
        edition = generator.generate_evening_edition(lookback_hours=args.lookback)
    else:
        edition = generator.generate_morning_edition(lookback_hours=args.lookback)

    if not edition:
        print("Failed to generate newsletter")
        return 1

    print(f"\nSubject: {edition.subject}")
    print(f"Videos included: {edition.content.video_count}")
    print(f"Meaningful content: {edition.content.has_meaningful_content}")
    print(f"Syntheses: {len(edition.content.syntheses)}")
    print(f"Theme syntheses: {len(edition.content.theme_syntheses)}")
    print(f"Recommendations: {len(edition.content.recommendations)}")

    if args.preview:
        print("\n" + "=" * 60)
        print("PREVIEW (Plain Text)")
        print("=" * 60)
        print(edition.plain_body)
        return 0

    # Archive to vault
    archive_to_vault(edition, args.edition)

    # Send if requested
    if args.send:
        print("\nSending newsletter...")
        message_id = send_newsletter(edition, dry_run=args.dry_run)
        if message_id:
            print(f"Sent successfully! Message ID: {message_id}")
        elif args.dry_run:
            print("Dry run complete")
        else:
            print("Failed to send")
            return 1

    print("\nDone!")
    return 0


if __name__ == '__main__':
    sys.exit(main())
