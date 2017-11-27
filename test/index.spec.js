const { expect } = require('chai')

const Plugin = require('../lib/index')

const clone = obj => JSON.parse(JSON.stringify(obj))

const testCli =
  () => {
    const lines = []
    return {
      log: msg => lines.push(msg),
      result: () => lines,
    }
  }

const checkLog =
  (cli, messages) => {
    const testLog = cli.result()
    expect(testLog.length).to.equal(messages.length)
    const max = Math.max(testLog.length, messages.length)
    for (let i = 0; i < max; i++) {
      expect(testLog[i]).to.equal(messages[i])
    }
  }

const serverlessStub =
  (policyArns, resources) => ({
    cli: testCli(),
    service: {
      provider: {
        managedPolicyArns: policyArns,
        compiledCloudFormationTemplate: {
          Resources: resources,
        },
      },
    },
  })

const testResources0 =
  {
    MyRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: 'MyRole',
      },
    },
  }

const testResources1 =
  {
    MyRole0: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: 'MyRole0',
      },
    },
    MyRole1: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: 'MyRole1',
      },
    },
    MyRole2: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: 'MyRole2',
      },
    },
  }

const testPolicyArn0 = 'arn:aws:iam::789763425617:policy/someteam/MyManagedPolicy-3QUG1777293EJ'
const testPolicyArn1 = 'arn:aws:iam::789763425617:policy/someteam/AnotherManagedPolicy-F6NZ1321293EJ'

describe('Attach Managed Policy Serverless Plugin', () => {
  it('can be instantiated', () => {
    const thePlugin = new Plugin({})

    expect(thePlugin).to.be.an.instanceOf(Plugin)
  })

  it('hooks the Serverless "before:deploy:deploy" event', () => {
    const thePlugin = new Plugin({})

    expect(thePlugin.hooks).to.have.all.keys(['before:deploy:deploy'])
  })

  it('doesn\'t do anything if neither managedPolicyArns nor CFT resources are included', () => {
    const slsStub = serverlessStub(null, null)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    checkLog(slsStub.cli, [])
  })

  it('doesn\'t do anything if no managedPolicyArns are included', () => {
    const resources = clone(testResources0)
    const slsStub = serverlessStub(null, resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole.Properties).not.to.have.keys(['ManagedPolicyArns'])

    checkLog(slsStub.cli, [])
  })

  it('doesn\'t do anything if no CFT resources are provided', () => {
    const slsStub = serverlessStub([testPolicyArn0], null)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(slsStub.cli.result().length).to.equal(0)
  })

  it('looks for roles if managedPolicyArns and resources are present', () => {
    const slsStub = serverlessStub([], [])
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      'Managed policy done.',
    ])
  })

  it('throws if an invalid looking policy ARN is provided', () => {
    const resources = clone(testResources0)
    const slsStub = serverlessStub(['not-valid-policy-ARN'], resources)
    const thePlugin = new Plugin(slsStub)

    expect(thePlugin.attachManagedPolicy.bind(thePlugin))
      .to.throw('"not-valid-policy-ARN" is not a valid policy ARN.')
  })

  it('does not add a duplicate policy', () => {
    const resources = clone(testResources0)
    resources.MyRole.Properties.ManagedPolicyArns = [testPolicyArn0]
    const slsStub = serverlessStub([testPolicyArn0], resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole).to.have.keys(['Type', 'Properties'])
    expect(resources.MyRole.Properties.ManagedPolicyArns.length).to.equal(1)
    expect(resources.MyRole.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      `${testResources0.MyRole.Properties.RoleName} role already has policy ${testPolicyArn0} applied, skipping.`,
      'Managed policy done.',
    ])
  })

  it('can add a policy where none exist', () => {
    const resources = clone(testResources0)
    const slsStub = serverlessStub([testPolicyArn0], resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole.Properties.ManagedPolicyArns.length).to.equal(1)
    expect(resources.MyRole.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      `Setting ${testPolicyArn0} as ManagedPolicyArn for ${testResources0.MyRole.Properties.RoleName}.`,
      'Managed policy done.',
    ])
  })

  it('supports providing a string as a single ManagedPolicyARN', () => {
    const resources = clone(testResources0)
    const slsStub = serverlessStub(testPolicyArn0, resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole.Properties.ManagedPolicyArns.length).to.equal(1)
    expect(resources.MyRole.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      `Setting ${testPolicyArn0} as ManagedPolicyArn for ${testResources0.MyRole.Properties.RoleName}.`,
      'Managed policy done.',
    ])
  })

  it('can add an additional policy to a role', () => {
    const resources = clone(testResources0)
    resources.MyRole.Properties.ManagedPolicyArns = [testPolicyArn0]
    const slsStub = serverlessStub([testPolicyArn1], resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole.Properties.ManagedPolicyArns.length).to.equal(2)
    expect(resources.MyRole.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)
    expect(resources.MyRole.Properties.ManagedPolicyArns[1]).to.equal(testPolicyArn1)

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      `Adding ${testPolicyArn1} to existing ManagedPolicyArns policies for ${testResources0.MyRole.Properties.RoleName}.`,
      'Managed policy done.',
    ])
  })

  it('can add multiple policies to roles as needed', () => {
    const resources = clone(testResources1)
    resources.MyRole0.Properties.ManagedPolicyArns = [testPolicyArn0]
    resources.MyRole1.Properties.ManagedPolicyArns = [testPolicyArn1]
    const slsStub = serverlessStub([testPolicyArn0, testPolicyArn1], resources)
    const thePlugin = new Plugin(slsStub)
    thePlugin.attachManagedPolicy()

    expect(resources.MyRole0.Properties.ManagedPolicyArns.length).to.equal(2)
    expect(resources.MyRole0.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)
    expect(resources.MyRole0.Properties.ManagedPolicyArns[1]).to.equal(testPolicyArn1)

    expect(resources.MyRole1.Properties.ManagedPolicyArns.length).to.equal(2)
    expect(resources.MyRole1.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn1)
    expect(resources.MyRole1.Properties.ManagedPolicyArns[1]).to.equal(testPolicyArn0)

    expect(resources.MyRole2.Properties.ManagedPolicyArns.length).to.equal(2)
    expect(resources.MyRole2.Properties.ManagedPolicyArns[0]).to.equal(testPolicyArn0)
    expect(resources.MyRole2.Properties.ManagedPolicyArns[1]).to.equal(testPolicyArn1)

    checkLog(slsStub.cli, [
      'Adding managed policies...',
      'Searching for roles...',
      `${testResources1.MyRole0.Properties.RoleName} role already has policy ${testPolicyArn0} applied, skipping.`,
      `Adding ${testPolicyArn1} to existing ManagedPolicyArns policies for ${testResources1.MyRole0.Properties.RoleName}.`,
      `Adding ${testPolicyArn0} to existing ManagedPolicyArns policies for ${testResources1.MyRole1.Properties.RoleName}.`,
      `${testResources1.MyRole1.Properties.RoleName} role already has policy ${testPolicyArn1} applied, skipping.`,
      `Setting ${testPolicyArn0} as ManagedPolicyArn for ${testResources1.MyRole2.Properties.RoleName}.`,
      `Adding ${testPolicyArn1} to existing ManagedPolicyArns policies for ${testResources1.MyRole2.Properties.RoleName}.`,
      'Managed policy done.',
    ])
  })
})
