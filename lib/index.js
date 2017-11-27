class ServerlessPlugin {
  /**
   * Create an instance of our ServerlessPlugin.
   * @param   {Object} serverless Host Serverless instance into which this
   *                              plugin is loading.
   * @returns {Object} Instance of this plugin for use by Serverless.
   */
  constructor(serverless) {
    this.serverless = serverless
    this.hooks = {
      'before:deploy:deploy': this.attachManagedPolicy.bind(this),
    }
  }

  /**
   * Get the policy or policies to be applied as an array.
   * @param   {string|string[]} policies Single policy ARN or array of them.
   * @returns {string[]}                 Array of policy ARNs.
   */
  // eslint-disable-next-line class-methods-use-this
  policiesArray(policies) {
    // Must be a string for a single policy or an array for multiple.
    if (typeof policies === 'string') {
      return [policies]
    } else if (policies instanceof Array) {
      return policies
    } else {
      throw new Error('managedPolicyArns must be an array')
    }
  }

  /**
   * Given a CFT role object, apply the list of policy ARNs to the role as Managed Policies.
   * @param {string|string[]} policies  Array of policy ARNs.
   * @param {Object}          role      CFT Role Resource to add the policies.
   */
  applyPoliciesToRole(policies, role) {
    const { cli } = this.serverless

    policies.forEach((policyArn) => {
      // Valid Policy ARN?
      if (!policyArn.match(/^arn:aws:iam::[0-9]+:policy\/.*$/)) {
        throw new Error(`"${policyArn}" is not a valid policy ARN.`)
      }

      // Don't bother applying policy if already applied.
      if (role.ManagedPolicyArns && role.ManagedPolicyArns.indexOf(policyArn) !== -1) {
        cli.log(`${role.RoleName} role already has policy ${policyArn} applied, skipping.`)
        return
      }

      // Either add to list of existing policies or start a list with this one.
      if (role.ManagedPolicyArns) {
        cli.log(`Adding ${policyArn} to existing ManagedPolicyArns policies for ${role.RoleName}.`)
        // eslint-disable-next-line no-param-reassign
        role.ManagedPolicyArns = role.ManagedPolicyArns.concat(policyArn)
      } else {
        cli.log(`Setting ${policyArn} as ManagedPolicyArn for ${role.RoleName}.`)
        // eslint-disable-next-line no-param-reassign
        role.ManagedPolicyArns = [policyArn]
      }
    })
  }

  /**
   * Handler for the Serverless before:deploy:deploy event.
   * Attaches the Managed Policy or Policies defined at `provider.managedPolicyArns`
   * to each of the roles in the service.
   */
  attachManagedPolicy() {
    // Bail if not policies are to be applied.
    if (!(this.serverless.service.provider.managedPolicyArns)) return
    if (!(this.serverless.service.provider.compiledCloudFormationTemplate.Resources)) return

    const { cli } = this.serverless
    const policies = this.serverless.service.provider.managedPolicyArns
    const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources

    cli.log('Adding managed policies...')
    cli.log('Searching for roles...')

    // Filter for any IAM Roles defined in CFT and apply our Managed Policies.
    Object.keys(resources)
      .filter(resourceName => resources[resourceName].Type === 'AWS::IAM::Role')
      .forEach(roleResource =>
        this.applyPoliciesToRole(this.policiesArray(policies), resources[roleResource].Properties))

    cli.log('Managed policy done.')
  }
}

module.exports = ServerlessPlugin
