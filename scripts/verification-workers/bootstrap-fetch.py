#!/usr/bin/python3
"""Bounded private bootstrap download before the bundled Node transport exists."""
import hashlib
import os
import sys
import boto3
from botocore.config import Config

bucket, key, destination, expected = sys.argv[1:]
client = boto3.client('s3', region_name='us-east-2', config=Config(connect_timeout=10, read_timeout=30, retries={'total_max_attempts': 1}))
temporary = destination + '.download'
try:
    response = client.get_object(Bucket=bucket, Key=key)
    digest = hashlib.sha256()
    total = 0
    with response['Body'] as body, open(temporary, 'wb') as output:
        os.chmod(temporary, 0o600)
        while True:
            chunk = body.read(1048576)
            if not chunk:
                break
            total += len(chunk)
            if total > 16777216:
                raise ValueError('Bootstrap bundle exceeds 16 MiB')
            digest.update(chunk)
            output.write(chunk)
    if digest.hexdigest() != expected:
        raise ValueError('Bootstrap bundle checksum mismatch')
    os.replace(temporary, destination)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
    client.close()
