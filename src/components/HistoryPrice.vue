<template>
	<div>
		<div class="app-title">历史价格</div>
		<el-table :data="historyData" border max-height="200" size="mini">
			<el-table-column type="index" label="#" width="50"></el-table-column>
			<el-table-column label="时间" width="160">
				<template slot-scope="scope">
					<span>{{ dayjs(scope.row.endTime).format('YYYY-MM-DD HH:mm:ss') }}</span>
				</template>
			</el-table-column>
			<el-table-column prop="offerPrice" label="成交价格" width="80"></el-table-column>
			<el-table-column prop="userNickname" label="用户昵称" width="160"></el-table-column>
		</el-table>
	</div>
</template>

<script>
const dayjs = require("dayjs");

export default {
	name: "HistoryPrice",
	props: ["historyData"],
	data () {
		return {
			dayjs: dayjs,
		}
	},

}
</script>

<style scoped></style>