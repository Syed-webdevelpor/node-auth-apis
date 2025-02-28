const { sendWithdrawalEmail } = require('../middlewares/sesMail.js')
module.exports = {

    withdrawalEmail: async (req, res, next) => {
        try {
            const {
                userId,
                selectedAccount,
                amount,
                accountName,
                bankName,
                branchName,
                swiftBic,
                iban,
                date,
            } = req.body;
            const data = await sendWithdrawalEmail(userId, selectedAccount, amount, accountName, bankName, branchName, swiftBic, iban, date)
            res.status(201).json({
                status: 201,
                message: data,
            });
        } catch (err) {
            next(err);
        }
    },
};
