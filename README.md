# serverless-attach-managed-policy

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

A [serverless](http://www.serverless.com) plugin to _automatically_ attach an [AWS Managed IAM Policy](http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html) (or Policies) to _all_ IAM Roles created by the Service.

## Install

`npm install --save-dev serverless-attach-managed-policy`

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-attach-managed-policy
```

## Configuration

For a single Policy.

```yaml
provider:
  name: aws
  managedPolicyArns: 'arn:aws:iam::789763425617:policy/someteam/MyManagedPolicy-3QUG1777293EJ'
```

For a multiple Policies.

```yaml
provider:
  name: aws
  managedPolicyArns:
    - 'arn:aws:iam::789763425617:policy/someteam/MyManagedPolicy-3QUG1777293EJ'
    - 'arn:aws:iam::789763425617:policy/someteam/AnotherManagedPolicy-F6NZ1321293EJ'
```
